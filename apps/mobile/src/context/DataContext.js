import React, { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { get } from "../lib/api";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      get("/home"),
      get("/feed"),
      get("/explorations"),
      get("/explorations/evidence"),
      get("/community/individuals"),
      get("/community/researchers"),
      get("/insights"),
      get("/profile"),
      get("/consent"),
      get("/social/follows"),
      get("/explore/copy"),
      get("/notifications"),
      get("/search"),
    ])
      .then(
        ([
          home,
          feed,
          explorationsRes,
          explorationEvidence,
          communityIndividuals,
          communityResearchers,
          insight,
          profile,
          consent,
          socialFollows,
          exploreCopy,
          notificationsRes,
          search,
        ]) => {
          // Restore explorations as object keyed by id (same shape as mock JSON)
          const explorations = {};
          for (const e of explorationsRes.items || []) {
            const { id, ...rest } = e;
            explorations[id] = rest;
          }

          // Rebuild community object from the two individual endpoints
          const commUsers = {};
          const basicUsers = [];
          const followerOnly = [];
          for (const u of communityIndividuals.items || []) {
            const { tier, id, ...rest } = u;
            if (tier === "comm") commUsers[id] = { ...rest };
            else if (tier === "basic") basicUsers.push({ id, ...rest });
            else followerOnly.push({ id, ...rest });
          }
          const community = {
            commUsers,
            basicUsers,
            followerOnly,
            researchers: communityResearchers.items || [],
            socialMeta: socialFollows,
            explorationFollowers: communityIndividuals.explorationFollowers || {},
          };

          setData({
            home,
            feed,
            explorations,
            explorationEvidence,
            community,
            insight,
            profile,
            consent,
            exploreCopy,
            notifications: notificationsRes.items || notificationsRes,
            search,
          });
        }
      )
      .catch((err) => console.error("[DataContext] failed to load:", err));
  }, []);

  if (!data) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F8F2" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
