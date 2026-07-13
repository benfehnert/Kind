import { useEffect, useMemo, useState } from "react";
import { get } from "../lib/api";

function toCommunityRow(profile, slug) {
  if (!profile) return null;
  return {
    id: profile.id || slug,
    name: profile.name,
    loc: profile.loc,
    img: profile.img,
    initials: profile.initials,
    avatarKey: profile.avatarKey,
    avatarUrl: profile.avatarUrl,
    meta: profile.meta || profile.locationLine,
    badges: profile.badges,
    exps: profile.exps
  };
}

/**
 * Fetches community profile rows for followed slugs missing from the cached directory.
 */
export function useFollowedIndividualProfiles({ following, knownIds, isSelf, enabled = true }) {
  const missingSlugs = useMemo(() => {
    if (!enabled) return [];
    const known = knownIds instanceof Set ? knownIds : new Set(knownIds || []);
    return [...following].filter((slug) => slug && !known.has(slug) && !isSelf?.(slug));
  }, [following, knownIds, isSelf, enabled]);

  const missingKey = missingSlugs.join(",");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!missingKey) {
      setRows([]);
      return undefined;
    }

    let cancelled = false;
    Promise.all(
      missingKey.split(",").map((slug) =>
        get(`/community/individuals/${encodeURIComponent(slug)}`)
          .then((profile) => toCommunityRow(profile, slug))
          .catch(() => null)
      )
    ).then((results) => {
      if (!cancelled) setRows(results.filter(Boolean));
    });

    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  return rows;
}

/**
 * Fetches follow-list rows for followed slugs missing from a remote follows response.
 */
export function useSupplementalFollowRows({ following, remoteRows, enabled = true }) {
  const missingSlugs = useMemo(() => {
    if (!enabled) return [];
    const remoteIds = new Set((remoteRows || []).map((row) => row.id));
    return [...following].filter((slug) => slug && !remoteIds.has(slug));
  }, [following, remoteRows, enabled]);

  const missingKey = missingSlugs.join(",");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!missingKey) {
      setRows([]);
      return undefined;
    }

    let cancelled = false;
    Promise.all(
      missingKey.split(",").map((slug) =>
        get(`/community/individuals/${encodeURIComponent(slug)}`)
          .then((profile) => {
            const row = toCommunityRow(profile, slug);
            return row ? { ...row, kind: "individual" } : null;
          })
          .catch(() => null)
      )
    ).then((results) => {
      if (!cancelled) setRows(results.filter(Boolean));
    });

    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  return rows;
}
