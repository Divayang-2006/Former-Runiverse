// This class represents the User data model.
// It encapsulates user properties and can include methods
// for formatting or validation.
export class User {
  public lastName: string;
  public username: string;
  public email: string;
  public mobileNumber: string;

  constructor(lastName: string, username:string, email: string, mobileNumber: string) {
    this.lastName = lastName;
    this.username = username;
    this.email = email;
    this.mobileNumber = mobileNumber;
  }

  // An example method that could be on the User model
  getFormattedMobile(): string {
    // Add logic to format the mobile number if needed
    return `+91 ${this.mobileNumber}`;
  }
}