import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, MapPin, Search, Users } from "lucide-react-native";
import axios from "axios";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { useTheme } from "@/context/ThemeContext";
import useDebounce from "@/hooks/useDebounce";
import { api } from "@/services/api";
import { authService } from "@/services/AuthService";
import { useStore } from "@/store/useStore";

type FriendStatus = "add" | "pending" | "friends" | "invite";

type CityFriend = {
  id: string;
  name: string;
  username: string;
  city: string;
  avatar: string;
  status: FriendStatus;
};

type ContactFriend = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  matchedHandle?: string;
  city?: string;
  onRuniverse: boolean;
  avatar: string;
  status: FriendStatus;
};

type PersonRow = (CityFriend | ContactFriend) & { subtitle?: string };

const mockCityFriends: CityFriend[] = [
  {
    id: "aarav",
    name: "Aarav Mehta",
    username: "aarav.run",
    city: "Gandhinagar",
    avatar: "https://i.pravatar.cc/150?u=aarav-runiverse",
    status: "friends",
  },
  {
    id: "priya",
    name: "Priya Sharma",
    username: "priya.moves",
    city: "Gandhinagar",
    avatar: "https://i.pravatar.cc/150?u=priya-runiverse",
    status: "pending",
  },
  {
    id: "veer",
    name: "Veer Patel",
    username: "veer.p",
    city: "Ahmedabad",
    avatar: "https://i.pravatar.cc/150?u=veer-runiverse",
    status: "add",
  },
  {
    id: "anaya",
    name: "Anaya Iyer",
    username: "anaya.miles",
    city: "Surat",
    avatar: "https://i.pravatar.cc/150?u=anaya-runiverse",
    status: "add",
  },
  {
    id: "kiran",
    name: "Kiran Desai",
    username: "kiran.des",
    city: "Gandhinagar",
    avatar: "https://i.pravatar.cc/150?u=kiran-runiverse",
    status: "friends",
  },
];

const mockContacts: ContactFriend[] = [
  {
    id: "c1",
    name: "Sanya Rao",
    phone: "+91 98765 43210",
    email: "sanya.rao@example.com",
    matchedHandle: "sanya.rides",
    city: "Delhi",
    onRuniverse: true,
    avatar: "https://i.pravatar.cc/150?u=sanya-runiverse",
    status: "add",
  },
  {
    id: "c2",
    name: "Rahul Khanna",
    phone: "+91 91234 56789",
    matchedHandle: "rahul.k",
    city: "Mumbai",
    onRuniverse: true,
    avatar: "https://i.pravatar.cc/150?u=rahul-runiverse",
    status: "pending",
  },
  {
    id: "c3",
    name: "Meera Joshi",
    phone: "+91 90909 12121",
    email: "meera@example.com",
    onRuniverse: false,
    avatar: "https://i.pravatar.cc/150?u=meera-runiverse",
    status: "invite",
  },
  {
    id: "c4",
    name: "Vikram Singh",
    phone: "+91 99880 77665",
    matchedHandle: "vikram.trails",
    city: "Chandigarh",
    onRuniverse: true,
    avatar: "https://i.pravatar.cc/150?u=vikram-runiverse",
    status: "friends",
  },
];

const getStatusStyle = (status: FriendStatus, isDark: boolean) => {
  switch (status) {
    case "add":
      return {
        label: "Add",
        backgroundColor: isDark ? "#2563EB" : "#2563EB",
        textColor: "#FFFFFF",
        borderColor: "transparent",
      };
    case "pending":
      return {
        label: "Pending",
        backgroundColor: isDark ? "rgba(234,179,8,0.15)" : "rgba(234,179,8,0.12)",
        textColor: isDark ? "#FCD34D" : "#B45309",
        borderColor: isDark ? "rgba(250,204,21,0.25)" : "rgba(234,179,8,0.35)",
      };
    case "friends":
      return {
        label: "Friends",
        backgroundColor: isDark ? "rgba(16,185,129,0.18)" : "rgba(16,185,129,0.12)",
        textColor: isDark ? "#34D399" : "#047857",
        borderColor: isDark ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.35)",
      };
    case "invite":
      return {
        label: "Invite",
        backgroundColor: isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.12)",
        textColor: isDark ? "#93C5FD" : "#1D4ED8",
        borderColor: isDark ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.35)",
      };
    default:
      return {
        label: status,
        backgroundColor: "rgba(148,163,184,0.2)",
        textColor: isDark ? "#E5E7EB" : "#475569",
        borderColor: "rgba(148,163,184,0.3)",
      };
  }
};

const renderSubtitle = (item: CityFriend | ContactFriend) => {
  if ("username" in item) {
    return `@${item.username} • ${item.city}`;
  }
  if (item.onRuniverse && item.matchedHandle) {
    return `On Runiverse as @${item.matchedHandle}${item.city ? ` • ${item.city}` : ""}`;
  }
  if (item.phone) {
    return item.phone;
  }
  if (item.email) {
    return item.email;
  }
  return item.city ?? "Runiverse contact";
};

const FriendRow = ({
  item,
  isDark,
  onPress,
}: {
  item: PersonRow;
  isDark: boolean;
  onPress?: (id: string, status: FriendStatus) => void;
}) => {
  const subtitle = item.subtitle ?? renderSubtitle(item);
  const style = getStatusStyle(item.status, isDark);
  const disabled = item.status === "friends" || item.status === "pending";

  return (
    <View
      className="flex-row items-center rounded-3xl px-4 py-3 mb-3"
      style={[
        styles.card,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB",
          shadowOpacity: isDark ? 0.1 : 0.05,
        },
      ]}
    >
      <Image source={{ uri: item.avatar }} className="w-12 h-12 rounded-full mr-3" />
      <View className="flex-1">
        <Text className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
          {item.name}
        </Text>
        <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{subtitle}</Text>
      </View>
      <Pressable
        onPress={() => onPress?.(item.id, item.status)}
        disabled={disabled}
        style={[
          styles.pill,
          {
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            opacity: disabled ? 0.8 : 1,
          },
        ]}
      >
        <Text style={[styles.pillLabel, { color: style.textColor }]}>{style.label}</Text>
      </Pressable>
    </View>
  );
};

const TabChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className={`px-4 py-2 rounded-full mr-3 border ${active ? "bg-blue-600" : "bg-transparent"}`}
    style={{
      borderColor: active ? "rgba(37,99,235,0.6)" : "rgba(148,163,184,0.4)",
    }}
  >
    <Text className={`text-sm font-semibold ${active ? "text-white" : "text-gray-600"}`}>{label}</Text>
  </Pressable>
);

const CityChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className={`px-4 py-2 rounded-2xl mr-2 border ${active ? "bg-emerald-500" : "bg-transparent"}`}
    style={{
      borderColor: active ? "rgba(16,185,129,0.6)" : "rgba(148,163,184,0.4)",
    }}
  >
    <Text className={`text-sm font-semibold ${active ? "text-white" : "text-gray-600"}`}>{label}</Text>
  </Pressable>
);

export default function AddFriendScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const userCity = useStore((state) => state.user?.city?.trim());
  const setSearchResults = useStore((state) => state.setSearchResults);

  const [activeTab, setActiveTab] = useState<"city" | "contacts">("city");
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFriends, setCityFriends] = useState<CityFriend[]>(mockCityFriends);
  const [contacts, setContacts] = useState<ContactFriend[]>(mockContacts);
  const [contactsPermission, setContactsPermission] = useState<"unknown" | "granted">("unknown");
  const [hasLoadedContacts, setHasLoadedContacts] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const defaultCity = userCity && userCity.length > 0 ? userCity : "Gandhinagar";
  const [selectedCity, setSelectedCity] = useState(defaultCity);
  const debouncedQuery = useDebounce(searchQuery, 500);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const bgClass = isDark ? "bg-[#0f1014]" : "bg-gray-50";
  const textPrimary = isDark ? "text-white" : "text-gray-900";

  const cityList = useMemo(() => {
    const unique = new Set<string>([defaultCity, ...cityFriends.map((f) => f.city)]);
    return Array.from(unique);
  }, [cityFriends, defaultCity]);

  const filteredCityFriends = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return cityFriends.filter((friend) => {
      const matchesCity = friend.city.toLowerCase() === selectedCity.toLowerCase();
      const matchesSearch =
        friend.name.toLowerCase().includes(query) || friend.username.toLowerCase().includes(query);
      return matchesCity && matchesSearch;
    });
  }, [cityFriends, searchQuery, selectedCity]);

  const filteredContacts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return contacts.filter((contact) => {
      const inSearch =
        contact.name.toLowerCase().includes(query) ||
        (contact.matchedHandle ?? "").toLowerCase().includes(query) ||
        (contact.phone ?? "").toLowerCase().includes(query) ||
        (contact.email ?? "").toLowerCase().includes(query);
      return inSearch;
    });
  }, [contacts, searchQuery]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      abortControllerRef.current?.abort();
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchSearchResults = async () => {
      try {
        setIsSearching(true);
        const token = authService.getToken() || undefined;
        const response = await axios.get(`${api.baseURL}/api/users/search`, {
          params: { query: debouncedQuery },
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!isMountedRef.current || controller.signal.aborted) return;

        const payload = response.data?.data ?? response.data?.results ?? [];
        setSearchResults(Array.isArray(payload) ? payload : []);
      } catch (error: any) {
        if (controller.signal.aborted) return;
        console.warn("Search request failed:", error?.message || error);
      } finally {
        if (isMountedRef.current && !controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    };

    fetchSearchResults();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, setSearchResults]);

  const handleCityAction = (id: string, status: FriendStatus) => {
    setCityFriends((prev) =>
      prev.map((friend) =>
        friend.id === id && status === "add" ? { ...friend, status: "pending" } : friend
      )
    );
  };

  const handleContactAction = (id: string, status: FriendStatus) => {
    setContacts((prev) =>
      prev.map((contact) => {
        if (contact.id !== id) return contact;
        if (status === "add") return { ...contact, status: "pending" };
        if (status === "invite") return { ...contact, status: "pending" };
        return contact;
      })
    );
  };

  const requestContacts = () => {
    setContactsPermission("granted");
    setHasLoadedContacts(true);
  };

  const renderList = () => {
    if (activeTab === "city") {
      return (
        <FlatList
          data={filteredCityFriends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FriendRow item={item} isDark={isDark} onPress={handleCityAction} />
          )}
          ListEmptyComponent={
            <View className="items-center py-12">
              <MapPin color={isDark ? "#94A3B8" : "#94A3B8"} />
              <Text className={`mt-3 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                No users found in this city.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    if (contactsPermission !== "granted") {
      return (
        <View
          className="rounded-3xl p-5 mt-4"
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB",
            borderWidth: 1,
          }}
        >
          <View className="flex-row items-center mb-3">
            <Users color={isDark ? "#93C5FD" : "#2563EB"} />
            <Text className={`ml-2 text-lg font-semibold ${textPrimary}`}>Sync your contacts</Text>
          </View>
          <Text className={isDark ? "text-gray-400" : "text-gray-600"}>
            Allow access to show which friends are already on Runiverse. We only use this to match
            phone numbers and emails.
          </Text>
          <Pressable onPress={requestContacts} className="mt-4 rounded-2xl">
            <View
              style={{
                backgroundColor: "#2563EB",
                paddingVertical: 12,
                alignItems: "center",
                borderRadius: 16,
              }}
            >
              <Text className="text-white font-semibold">Allow contacts</Text>
            </View>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FriendRow
            item={{ ...item, subtitle: item.onRuniverse ? renderSubtitle(item) : "Invite to Runiverse" }}
            isDark={isDark}
            onPress={handleContactAction}
          />
        )}
        ListHeaderComponent={
          hasLoadedContacts ? (
            <View className="mb-4">
              <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Showing contacts matched by phone or email.
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Users color={isDark ? "#94A3B8" : "#94A3B8"} />
            <Text className={`mt-3 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              No contacts on Runiverse yet.
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <ScreenWrapper bg={bgClass}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-2 pb-4">
          <View className="flex-row items-center mb-4">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB",
              }}
            >
              <ArrowLeft color={isDark ? "#E5E7EB" : "#111827"} />
            </Pressable>
            <Text className={`text-3xl font-bold ${textPrimary}`}>Add friends</Text>
          </View>

          <View className="flex-row mb-4">
            <TabChip label="City" active={activeTab === "city"} onPress={() => setActiveTab("city")} />
            <TabChip
              label="Contacts"
              active={activeTab === "contacts"}
              onPress={() => setActiveTab("contacts")}
            />
          </View>

          <View
            className="flex-row items-center px-3 py-2 rounded-2xl mb-4 border"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB",
            }}
          >
            <Search color={isDark ? "#94A3B8" : "#64748B"} size={18} />
            <TextInput
              placeholder="Search by name or username"
              placeholderTextColor={isDark ? "#94A3B8" : "#9CA3AF"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className={`ml-3 flex-1 text-base ${textPrimary}`}
            />
          {isSearching && (
            <ActivityIndicator size="small" color={isDark ? "#CBD5E1" : "#2563EB"} />
          )}
          </View>

          {activeTab === "city" && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              contentContainerStyle={{ paddingRight: 8 }}
            >
              {cityList.map((city) => (
                <CityChip key={city} label={city} active={selectedCity === city} onPress={() => setSelectedCity(city)} />
              ))}
            </ScrollView>
          )}
        </View>

        <View className="flex-1 px-5">{renderList()}</View>
      </SafeAreaView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 3,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 90,
    alignItems: "center",
  },
  pillLabel: {
    fontWeight: "700",
    fontSize: 13,
  },
});

