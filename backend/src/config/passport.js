import dotenv from "dotenv";
dotenv.config();
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase?.() || null;

        let user = await User.findOne({
          oauthProvider: "google",
          oauthId: profile.id,
        });

        if (!user && email) {
          user = await User.findOne({ email });
          if (user) {
            user.oauthProvider = "google";
            user.oauthId = profile.id;
            user.displayName = profile.displayName;
            user.avatar = profile.photos?.[0]?.value;
            await user.save();
          }
        }

        if (!user) {
          user = await User.create({
            username: email ? email.split("@")[0] : `g_${profile.id}`,
            email,
            password: "GOOGLE_AUTH",
            oauthProvider: "google",
            oauthId: profile.id,
            displayName: profile.displayName,
            avatar: profile.photos?.[0]?.value,
          });
        }
        const token = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRATION || "7d" }
        );
        return done(null, { user, token });
      } catch (err) {
        return done(err);
      }
    }
  )
);

export default passport;
