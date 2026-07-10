export const PRIVACY_WITHDRAW_KEYS = new Set(["globalConsent", "science", "visible"]);

export const PROFILE_WITHDRAW_CONFIRMATIONS = {
  globalConsent: {
    message:
      "At Kind, we need to have your Global consent to provide Kind to you. If you remove the Global consent, you will no longer be able to use Kind."
  },
  science: {
    message:
      "At Kind, we have a commitment to support scientific progress - something you can help with by letting Kind researchers access your de-identified data. If you remove your agreement here, your de-identified data will no longer be used to support citizen science."
  },
  visible: {
    message:
      "At Kind, we hope that all Individuals can help others and can in turn be helped by other individuals. If you remove your agreement here, you can still use Kind but will not be visible to other Individuals and will not be able to see other Individuals."
  }
};

export const COMMUNITY_VISIBILITY_WITHDRAWN_COPY = {
  title: "Community visibility updated",
  body:
    "To apply this change, please log out and log back in again. When you log back in, you will not be visible to other Individuals and will not be able to see other Individuals.",
  logoutButton: "Log out"
};
