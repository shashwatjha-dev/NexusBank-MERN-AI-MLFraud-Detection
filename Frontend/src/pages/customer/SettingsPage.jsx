import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  UserRound,
  ShieldCheck,
  SlidersHorizontal,
  IdCard,
  Monitor,
  LogOut,
  Save,
  KeyRound,
  Camera,
  Upload,
  Bell,
  Palette,
  Smartphone,
  LockKeyhole,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  X,
  Eye,
  EyeOff,
  ShieldAlert,
  Laptop,
  Globe2,
  Mail,
  Activity,
  FileText,
  ArrowRight,
  RefreshCw,
  Check,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import { useApi } from "../../hooks/useApi.js";
import { authService } from "../../services/authService.js";
import { apiClient } from "../../services/apiClient.js";

import {
  formatDateTime,
  relativeFromNow,
} from "../../utils/date.js";

import "./SettingsPage.css";

const TABS = [
  {
    key: "profile",
    label: "Profile",
    description: "Personal information",
    icon: UserRound,
  },
  {
    key: "security",
    label: "Security",
    description: "Password & devices",
    icon: ShieldCheck,
  },
  {
    key: "preferences",
    label: "Preferences",
    description: "Notifications & theme",
    icon: SlidersHorizontal,
  },
  {
    key: "identity",
    label: "Identity",
    description: "Identity & KYC",
    icon: IdCard,
  },
  {
    key: "sessions",
    label: "Sessions",
    description: "Active devices",
    icon: Monitor,
  },
];

const pageVariants = {
  hidden: {
    opacity: 0,
    y: 16,
  },

  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 12,
  },

  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

/* =========================================================
   HELPERS
   ========================================================= */

function getInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "NB"
  );
}

function getProfilePhoto(user) {
  const photo =
    user?.profilePhotoUrl ||
    user?.profilePhoto ||
    user?.avatarUrl ||
    user?.photoUrl ||
    null;

  if (!photo) return null;

  if (
    /^https?:\/\//i.test(photo) ||
    photo.startsWith("blob:") ||
    photo.startsWith("data:")
  ) {
    return photo;
  }

  const apiBase =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api";

  const serverBase = apiBase.replace(
    /\/api\/?$/,
    ""
  );

  return `${serverBase}${
    photo.startsWith("/")
      ? photo
      : `/${photo}`
  }`;
}

function getStoredTheme() {
  const saved =
    window.localStorage.getItem(
      "nexusbank.theme"
    );

  return ["light", "dark", "system"].includes(
    saved
  )
    ? saved
    : "system";
}

function resolveTheme(theme) {
  if (theme === "system") {
    return window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches
      ? "dark"
      : "light";
  }

  return theme;
}

function applyTheme(theme) {
  document.documentElement.setAttribute(
    "data-theme",
    resolveTheme(theme)
  );

  document.documentElement.setAttribute(
    "data-theme-preference",
    theme
  );

  window.localStorage.setItem(
    "nexusbank.theme",
    theme
  );

  window.dispatchEvent(
    new CustomEvent(
      "nexusbank:theme-change",
      {
        detail: theme,
      }
    )
  );
}

/* =========================================================
   FIELD
   ========================================================= */

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  placeholder,
  required = false,
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>

      <input
        className="settings-input"
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

/* =========================================================
   SECTION CARD
   ========================================================= */

function SectionCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  className = "",
}) {
  return (
    <motion.section
      className={`settings-section-card ${className}`}
      variants={itemVariants}
      whileHover={{ y: -2 }}
    >
      <div className="settings-section-card__head">
        <div className="settings-section-card__icon">
          <Icon size={19} />
        </div>

        <div>
          <span className="settings-section-card__eyebrow">
            {eyebrow}
          </span>

          <h2>{title}</h2>

          {description && (
            <p>{description}</p>
          )}
        </div>
      </div>

      <div className="settings-section-card__body">
        {children}
      </div>
    </motion.section>
  );
}

/* =========================================================
   TOGGLE
   ========================================================= */

function Toggle({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
}) {
  return (
    <label className="settings-toggle">
      <div className="settings-toggle__icon">
        {Icon ? (
          <Icon size={17} />
        ) : (
          <Bell size={17} />
        )}
      </div>

      <div className="settings-toggle__copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </div>

      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
      />

      <span className="settings-toggle__track">
        <span className="settings-toggle__thumb" />
      </span>
    </label>
  );
}

/* =========================================================
   SECURITY SCORE
   ========================================================= */

function SecurityScore({ score }) {
  const safeScore = Math.max(
    0,
    Math.min(100, Number(score) || 0)
  );

  const label =
    safeScore >= 85
      ? "Excellent"
      : safeScore >= 65
        ? "Good"
        : "Needs attention";

  return (
    <div className="settings-score">
      <div
        className="settings-score__ring"
        style={{
          "--score": `${safeScore}%`,
        }}
      >
        <div>
          <strong>{safeScore}</strong>
          <span>/100</span>
        </div>
      </div>

      <div>
        <span className="settings-score__eyebrow">
          SECURITY SCORE
        </span>

        <h3>{label}</h3>

        <p>
          Review the recommendations below
          to keep your account protected.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   PROFILE PHOTO VIEWER
   ========================================================= */

function ProfilePhotoViewer({
  photo,
  name,
  onClose,
}) {
  useEffect(() => {
    if (!photo) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [photo, onClose]);

  if (!photo) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="settings-photo-preview"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            onClose();
          }
        }}
      >
        <motion.div
          className="settings-photo-preview__content"
          initial={{
            opacity: 0,
            scale: 0.85,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            scale: 0.9,
          }}
        >
          <img
            src={photo}
            alt={
              name
                ? `${name} profile`
                : "Profile"
            }
            className="settings-photo-preview__image"
          />

          <button
            type="button"
            className="settings-photo-preview__close"
            onClick={onClose}
            aria-label="Close photo"
          >
            <X size={20} />
          </button>

          <div className="settings-photo-preview__label">
            {name ||
              "NexusBank Customer"}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* =========================================================
   AVATAR
   ========================================================= */

function ProfileAvatar({
  user,
  sizeClass = "",
  onOpen,
}) {
  const photo =
    getProfilePhoto(user);

  return (
    <motion.button
      type="button"
      className={`settings-avatar settings-avatar--clickable ${sizeClass}`}
      onClick={() => {
        if (photo) {
          onOpen?.(photo);
        }
      }}
      whileHover={
        photo
          ? { scale: 1.04 }
          : undefined
      }
      whileTap={
        photo
          ? { scale: 0.97 }
          : undefined
      }
    >
      {photo ? (
        <img
          src={photo}
          alt={
            user?.name ||
            "Profile"
          }
        />
      ) : (
        getInitials(user?.name)
      )}

      {photo && (
        <span className="settings-avatar__view-indicator">
          <Eye size={12} />
        </span>
      )}
    </motion.button>
  );
}

/* =========================================================
   MAIN SETTINGS PAGE
   ========================================================= */

export function SettingsPage() {
  const {
    user,
    setUser,
    signOut,
  } = useAuth();

  const [tab, setTab] =
    useState("profile");

  const [viewPhoto, setViewPhoto] =
    useState(null);

  const currentTab =
    TABS.find(
      (item) => item.key === tab
    ) || TABS[0];

  const securityScore = useMemo(() => {
    if (user?.securityScore != null) {
      return Number(
        user.securityScore
      );
    }

    return 92;
  }, [user]);

  return (
    <motion.div
      className="settings-page"
      data-testid="settings-page"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="settings-orb settings-orb--one" />
      <div className="settings-orb settings-orb--two" />

      <motion.header
        className="settings-hero"
        variants={itemVariants}
      >
        <div>
          <div className="settings-hero__eyebrow">
            <ShieldCheck size={14} />
            <span>ACCOUNT SETTINGS</span>
          </div>

          <h1>Settings</h1>

          <p>
            Manage your profile, security
            and preferences.
          </p>
        </div>

        <div className="settings-hero__user">
          <ProfileAvatar
            user={user}
            onOpen={setViewPhoto}
          />

          <div>
            <strong>
              {user?.name ||
                "NexusBank Customer"}
            </strong>

            <span>
              {user?.email ||
                "Customer account"}
            </span>
          </div>

          <span className="settings-online-dot" />
        </div>
      </motion.header>

      <motion.div
        className="settings-layout"
        variants={itemVariants}
      >
        <aside className="settings-sidebar">
          <div className="settings-sidebar__label">
            SETTINGS
          </div>

          <div className="settings-profile-mini">
            <ProfileAvatar
              user={user}
              onOpen={setViewPhoto}
            />

            <div>
              <strong>
                {user?.name ||
                  "Customer"}
              </strong>

              <span>
                {user?.role ||
                  "CUSTOMER"}
              </span>
            </div>
          </div>

          <nav className="settings-tabs">
            {TABS.map(
              ({
                key,
                label,
                description,
                icon: Icon,
              }) => {
                const active =
                  tab === key;

                return (
                  <motion.button
                    key={key}
                    type="button"
                    className={`settings-tab ${
                      active
                        ? "settings-tab--active"
                        : ""
                    }`}
                    onClick={() =>
                      setTab(key)
                    }
                    whileTap={{
                      scale: 0.98,
                    }}
                  >
                    <span className="settings-tab__icon">
                      <Icon size={18} />
                    </span>

                    <span className="settings-tab__copy">
                      <strong>
                        {label}
                      </strong>

                      <small>
                        {description}
                      </small>
                    </span>

                    {active && (
                      <motion.span
                        layoutId="settings-active-line"
                        className="settings-tab__active-line"
                      />
                    )}
                  </motion.button>
                );
              }
            )}
          </nav>

          <div className="settings-sidebar__security">
            <div className="settings-sidebar__security-icon">
              <ShieldCheck size={19} />
            </div>

            <strong>
              Your security matters
            </strong>

            <p>
              NexusBank continuously
              monitors your account for
              suspicious activity.
            </p>

            <span>
              <i /> Protection active
            </span>
          </div>

          <button
            type="button"
            className="settings-logout"
            onClick={signOut}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </aside>

        <main className="settings-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              className="settings-content__tab"
              initial={{
                opacity: 0,
                x: 12,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              exit={{
                opacity: 0,
                x: -8,
              }}
            >
              <div className="settings-content__title">
                <div>
                  <span>
                    {currentTab.key ===
                    "profile"
                      ? "ACCOUNT"
                      : currentTab.label.toUpperCase()}
                  </span>

                  <h2>
                    {currentTab.label}
                  </h2>

                  <p>
                    {
                      currentTab.description
                    }
                  </p>
                </div>

                <div className="settings-content__title-icon">
                  {(() => {
                    const Icon =
                      currentTab.icon;

                    return (
                      <Icon size={21} />
                    );
                  })()}
                </div>
              </div>

              {tab === "profile" && (
                <ProfileTab
                  user={user}
                  onSaved={setUser}
                  onOpenPhoto={
                    setViewPhoto
                  }
                />
              )}

              {tab === "security" && (
                <SecurityTab
                  user={user}
                  securityScore={
                    securityScore
                  }
                />
              )}

              {tab ===
                "preferences" && (
                <PreferencesTab
                  user={user}
                  onSaved={setUser}
                />
              )}

              {tab === "identity" && (
                <IdentityTab
                  user={user}
                />
              )}

              {tab === "sessions" && (
                <SessionsTab />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>

      <ProfilePhotoViewer
        photo={viewPhoto}
        name={user?.name}
        onClose={() =>
          setViewPhoto(null)
        }
      />
    </motion.div>
  );
}

/* =========================================================
   PROFILE TAB
   ========================================================= */

function ProfileTab({
  user,
  onSaved,
  onOpenPhoto,
}) {
  const toast = useToast();

  const [values, setValues] =
    useState({
      name: user?.name || "",
      phone: user?.phone || "",
      address: {
        line1:
          user?.address?.line1 ||
          "",
        line2:
          user?.address?.line2 ||
          "",
        city:
          user?.address?.city ||
          "",
        state:
          user?.address?.state ||
          "",
        postalCode:
          user?.address
            ?.postalCode || "",
        country:
          user?.address?.country ||
          "India",
      },
    });

  const [busy, setBusy] =
    useState(false);

  const [photoPreview, setPhotoPreview] =
    useState(
      getProfilePhoto(user)
    );

  const [photoFile, setPhotoFile] =
    useState(null);

  const [photoBusy, setPhotoBusy] =
    useState(false);

  useEffect(() => {
    setPhotoPreview(
      getProfilePhoto(user)
    );

    setValues({
      name: user?.name || "",
      phone: user?.phone || "",
      address: {
        line1:
          user?.address?.line1 ||
          "",
        line2:
          user?.address?.line2 ||
          "",
        city:
          user?.address?.city ||
          "",
        state:
          user?.address?.state ||
          "",
        postalCode:
          user?.address
            ?.postalCode || "",
        country:
          user?.address?.country ||
          "India",
      },
    });
  }, [user]);

  /* =======================================================
     PHOTO SELECT
     IMPORTANT:
     FileReader is used here instead of blob URL so that
     the preview always renders correctly.
     ======================================================= */

  const selectPhoto = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      toast.error(
        "Choose a JPG, PNG or WEBP image."
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      toast.error(
        "Profile photo must be smaller than 5 MB."
      );

      event.target.value = "";

      return;
    }

    setPhotoFile(file);

    const reader =
      new FileReader();

    reader.onload = () => {
      setPhotoPreview(
        reader.result
      );
    };

    reader.onerror = () => {
      toast.error(
        "Could not preview the selected photo."
      );
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  };

  /* =======================================================
     UPLOAD PHOTO
     ======================================================= */

  const uploadPhoto = async () => {
    if (!photoFile) return;

    setPhotoBusy(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "photo",
        photoFile
      );

      const response =
        await apiClient.post(
          "/auth/profile/photo",
          formData
        );

      const payload =
        response?.data?.data ||
        response?.data ||
        {};

      const photoUrl =
        payload.profilePhotoUrl ||
        payload.photoUrl ||
        payload.profilePhoto ||
        payload.avatarUrl;

      const nextUser =
        payload.user || {
          ...user,
          ...payload,
          ...(photoUrl
            ? {
                profilePhotoUrl:
                  photoUrl,
              }
            : {}),
        };

      const finalPhoto =
        photoUrl ||
        getProfilePhoto(
          nextUser
        ) ||
        photoPreview;

      if (finalPhoto) {
        setPhotoPreview(
          finalPhoto
        );
      }

      onSaved?.(nextUser);

      setPhotoFile(null);

      toast.success(
        response?.data
          ?.message ||
          "Profile picture updated."
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Could not upload profile picture."
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  const cancelPhoto = () => {
    setPhotoFile(null);

    setPhotoPreview(
      getProfilePhoto(user)
    );
  };

  const change = (
    path,
    value
  ) => {
    setValues((prev) => {
      if (
        !path.startsWith(
          "address."
        )
      ) {
        return {
          ...prev,
          [path]: value,
        };
      }

      const field =
        path.slice(8);

      return {
        ...prev,
        address: {
          ...prev.address,
          [field]: value,
        },
      };
    });
  };

  const save = async (
    event
  ) => {
    event.preventDefault();

    if (!values.name.trim()) {
      return toast.error(
        "Full name is required."
      );
    }

    if (
      !/^\d{10}$/.test(
        values.phone.trim()
      )
    ) {
      return toast.error(
        "Enter a valid 10-digit phone number."
      );
    }

    setBusy(true);

    try {
      const result =
        await authService.updateProfile(
          values
        );

      const nextUser =
        result?.data?.user ||
        result?.data ||
        result?.user ||
        result;

      onSaved?.(nextUser);

      toast.success(
        result?.message ||
          "Profile updated."
      );
    } catch (error) {
      toast.error(
        error.message
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="settings-stack"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <SectionCard
        icon={Camera}
        eyebrow="PROFILE"
        title="Profile picture"
        description="Personalise your NexusBank account."
      >
        <div className="settings-profile-upload">
          <motion.button
            type="button"
            className="settings-avatar settings-avatar--large settings-avatar--clickable"
            onClick={() => {
              if (
                photoPreview
              ) {
                onOpenPhoto?.(
                  photoPreview
                );
              }
            }}
            whileHover={{
              scale: 1.04,
            }}
            whileTap={{
              scale: 0.97,
            }}
          >
            {photoPreview ? (
              <img
                src={photoPreview}
                alt={
                  user?.name ||
                  "Profile"
                }
              />
            ) : (
              getInitials(
                user?.name
              )
            )}

            {photoPreview && (
              <span className="settings-avatar__view-indicator">
                <Eye size={13} />
              </span>
            )}

            <label
              className="settings-camera"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <Camera size={15} />

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  selectPhoto
                }
                hidden
              />
            </label>
          </motion.button>

          <div className="settings-upload-copy">
            <strong>
              {photoFile?.name ||
                "Upload your profile picture"}
            </strong>

            <span>
              JPG, PNG or WEBP ·
              Maximum 5 MB
            </span>

            <div className="settings-upload-actions">
              <label className="settings-upload">
                <Upload size={15} />

                Choose photo

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    selectPhoto
                  }
                  hidden
                />
              </label>

              {photoFile && (
                <>
                  <button
                    type="button"
                    className="settings-primary-button"
                    onClick={
                      uploadPhoto
                    }
                    disabled={
                      photoBusy
                    }
                  >
                    {photoBusy ? (
                      <RefreshCw
                        className="settings-spin"
                        size={15}
                      />
                    ) : (
                      <Save
                        size={15}
                      />
                    )}

                    {photoBusy
                      ? "Uploading..."
                      : "Save photo"}
                  </button>

                  <button
                    type="button"
                    className="settings-icon-button"
                    onClick={
                      cancelPhoto
                    }
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <motion.form
        onSubmit={save}
        className="settings-stack"
        variants={itemVariants}
      >
        <SectionCard
          icon={UserRound}
          eyebrow="PERSONAL INFORMATION"
          title="Your details"
          description="Keep your registered information up to date."
        >
          <div className="settings-form-grid">
            <Field
              label="Full name"
              value={values.name}
              onChange={(e) =>
                change(
                  "name",
                  e.target.value
                )
              }
              required
            />

            <Field
              label="Phone number"
              value={values.phone}
              onChange={(e) =>
                change(
                  "phone",
                  e.target.value
                )
              }
              required
            />

            <Field
              label="Email address"
              value={
                user?.email || ""
              }
              disabled
            />

            <Field
              label="Customer ID"
              value={
                user?.accountNumber ||
                ""
              }
              disabled
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={Globe2}
          eyebrow="MAILING ADDRESS"
          title="Where to reach you"
          description="Your registered mailing information."
        >
          <div className="settings-form-grid settings-form-grid--one">
            <Field
              label="Address line 1"
              value={
                values.address
                  .line1
              }
              onChange={(e) =>
                change(
                  "address.line1",
                  e.target.value
                )
              }
            />

            <Field
              label="Address line 2"
              value={
                values.address
                  .line2
              }
              onChange={(e) =>
                change(
                  "address.line2",
                  e.target.value
                )
              }
            />
          </div>

          <div className="settings-form-grid settings-form-grid--three">
            <Field
              label="City"
              value={
                values.address
                  .city
              }
              onChange={(e) =>
                change(
                  "address.city",
                  e.target.value
                )
              }
            />

            <Field
              label="State"
              value={
                values.address
                  .state
              }
              onChange={(e) =>
                change(
                  "address.state",
                  e.target.value
                )
              }
            />

            <Field
              label="Postal code"
              value={
                values.address
                  .postalCode
              }
              onChange={(e) =>
                change(
                  "address.postalCode",
                  e.target.value
                )
              }
            />
          </div>

          <div className="settings-form-grid settings-form-grid--one">
            <Field
              label="Country"
              value={
                values.address
                  .country
              }
              onChange={(e) =>
                change(
                  "address.country",
                  e.target.value
                )
              }
            />
          </div>
        </SectionCard>

        <div className="settings-actions">
          <button
            type="submit"
            className="settings-primary-button"
            disabled={busy}
          >
            {busy ? (
              <RefreshCw
                className="settings-spin"
                size={16}
              />
            ) : (
              <Save size={16} />
            )}

            {busy
              ? "Saving..."
              : "Save changes"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

/* =========================================================
   SECURITY TAB
   ========================================================= */

function SecurityTab({
  user,
  securityScore,
}) {
  const toast = useToast();

  const sessions =
    useApi(
      () =>
        authService.listSessions(),
      []
    );

  const [pw, setPw] =
    useState({
      currentPassword: "",
      newPassword: "",
      confirm: "",
    });

  const [
    showPasswords,
    setShowPasswords,
  ] = useState(false);

  const [
    pwBusy,
    setPwBusy,
  ] = useState(false);

  const [
    securityPrefs,
    setSecurityPrefs,
  ] = useState({
    notifyOnLogin:
      user?.preferences
        ?.notifyOnLogin ??
      true,

    notifyOnFraud:
      user?.preferences
        ?.notifyOnFraud ??
      true,

    notifyOnTransfer:
      user?.preferences
        ?.notifyOnTransfer ??
      true,

    emailNotifications:
      user?.preferences
        ?.emailNotifications ??
      true,
  });

  const [
    savingSecurityPref,
    setSavingSecurityPref,
  ] = useState(null);

  useEffect(() => {
    setSecurityPrefs({
      notifyOnLogin:
        user?.preferences
          ?.notifyOnLogin ??
        true,

      notifyOnFraud:
        user?.preferences
          ?.notifyOnFraud ??
        true,

      notifyOnTransfer:
        user?.preferences
          ?.notifyOnTransfer ??
        true,

      emailNotifications:
        user?.preferences
          ?.emailNotifications ??
        true,
    });
  }, [user]);

  const strength = useMemo(() => {
    const value =
      pw.newPassword;

    let score = 0;

    if (value.length >= 8)
      score++;

    if (value.length >= 12)
      score++;

    if (/[A-Z]/.test(value))
      score++;

    if (/[a-z]/.test(value))
      score++;

    if (/\d/.test(value))
      score++;

    if (
      /[^A-Za-z0-9]/.test(
        value
      )
    )
      score++;

    return Math.min(
      100,
      Math.round(
        (score / 6) * 100
      )
    );
  }, [pw.newPassword]);

  const strengthLabel =
    strength >= 85
      ? "Strong"
      : strength >= 55
        ? "Good"
        : strength >= 30
          ? "Fair"
          : "Weak";

  const changeSecurityPreference =
    async (
      key,
      checked
    ) => {
      const previous =
        securityPrefs[key];

      setSecurityPrefs(
        (current) => ({
          ...current,
          [key]: checked,
        })
      );

      setSavingSecurityPref(
        key
      );

      try {
        const result =
          await authService.updatePreferences(
            {
              ...securityPrefs,
              [key]: checked,
            }
          );

        toast.success(
          result?.message ||
            "Security preference updated."
        );
      } catch (error) {
        setSecurityPrefs(
          (current) => ({
            ...current,
            [key]: previous,
          })
        );

        toast.error(
          error?.message ||
            "Could not update this security setting."
        );
      } finally {
        setSavingSecurityPref(
          null
        );
      }
    };

  const changePassword =
    async (event) => {
      event.preventDefault();

      if (
        !pw.currentPassword
      ) {
        return toast.error(
          "Enter your current password."
        );
      }

      if (
        pw.newPassword.length <
        8
      ) {
        return toast.error(
          "Password must contain at least 8 characters."
        );
      }

      if (
        pw.newPassword !==
        pw.confirm
      ) {
        return toast.error(
          "New passwords do not match."
        );
      }

      setPwBusy(true);

      try {
        const result =
          await authService.changePassword(
            {
              currentPassword:
                pw.currentPassword,

              newPassword:
                pw.newPassword,
            }
          );

        toast.success(
          result?.message ||
            "Password updated."
        );

        setPw({
          currentPassword:
            "",
          newPassword: "",
          confirm: "",
        });

        sessions.refetch();
      } catch (error) {
        toast.error(
          error?.message ||
            "Could not update your password."
        );
      } finally {
        setPwBusy(false);
      }
    };

  const securityControls = [
    {
      key: "notifyOnLogin",
      title: "Login alerts",
      description:
        "Get notified when a new device signs in.",
      icon: Bell,
    },
    {
      key: "notifyOnFraud",
      title: "Fraud alerts",
      description:
        "Keep high-risk activity notifications enabled.",
      icon: ShieldAlert,
    },
    {
      key: "notifyOnTransfer",
      title: "Transfer alerts",
      description:
        "Receive notifications when transfers are completed.",
      icon: Activity,
    },
    {
      key: "emailNotifications",
      title: "Email protection",
      description:
        "Deliver important security notifications to your email.",
      icon: Mail,
    },
  ];

  return (
    <motion.div
      className="settings-stack"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <SectionCard
        icon={ShieldCheck}
        eyebrow="PROTECTION STATUS"
        title="Your security overview"
        description="A quick view of the protections currently active on your account."
      >
        <SecurityScore
          score={securityScore}
        />

        <div className="settings-recommendations">
          <Recommendation
            done={
              securityPrefs.notifyOnLogin
            }
            icon={Bell}
            title="Login alerts"
            text="Get notified when a new device signs in."
          />

          <Recommendation
            done={
              securityPrefs.notifyOnFraud
            }
            icon={ShieldAlert}
            title="Fraud alerts"
            text="Keep high-risk activity notifications enabled."
          />

          <Recommendation
            done={
              securityPrefs.notifyOnTransfer
            }
            icon={Activity}
            title="Account activity"
            text="Your account has recent authenticated activity."
          />

          <Recommendation
            done={
              Number(
                securityScore
              ) >= 85
            }
            icon={Sparkles}
            title="Strong protection"
            text="Your account has a strong protection score."
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={ShieldCheck}
        eyebrow="SECURITY CONTROLS"
        title="Protection controls"
        description="Manage important security notifications."
      >
        <div className="settings-toggle-list">
          {securityControls.map(
            (item) => (
              <div
                key={item.key}
                className="settings-security-control"
              >
                <Toggle
                  label={item.title}
                  description={
                    item.description
                  }
                  checked={
                    securityPrefs[
                      item.key
                    ]
                  }
                  onChange={(
                    checked
                  ) =>
                    changeSecurityPreference(
                      item.key,
                      checked
                    )
                  }
                  icon={item.icon}
                />

                {savingSecurityPref ===
                  item.key && (
                  <span className="settings-saving-inline">
                    <RefreshCw
                      className="settings-spin"
                      size={13}
                    />
                    Saving
                  </span>
                )}
              </div>
            )
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={KeyRound}
        eyebrow="PASSWORD"
        title="Change your password"
        description="Use a strong password you do not reuse elsewhere."
      >
        <form
          onSubmit={
            changePassword
          }
          className="settings-stack"
        >
          <div className="settings-password-grid">
            <div className="settings-password-field">
              <Field
                label="Current password"
                type={
                  showPasswords
                    ? "text"
                    : "password"
                }
                value={
                  pw.currentPassword
                }
                onChange={(e) =>
                  setPw({
                    ...pw,
                    currentPassword:
                      e.target.value,
                  })
                }
              />

              <button
                type="button"
                className="settings-password-eye"
                onClick={() =>
                  setShowPasswords(
                    (value) =>
                      !value
                  )
                }
              >
                {showPasswords ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>

            <Field
              label="New password"
              type={
                showPasswords
                  ? "text"
                  : "password"
              }
              value={
                pw.newPassword
              }
              onChange={(e) =>
                setPw({
                  ...pw,
                  newPassword:
                    e.target.value,
                })
              }
            />

            <Field
              label="Confirm new password"
              type={
                showPasswords
                  ? "text"
                  : "password"
              }
              value={pw.confirm}
              onChange={(e) =>
                setPw({
                  ...pw,
                  confirm:
                    e.target.value,
                })
              }
            />
          </div>

          <div className="settings-strength">
            <div className="settings-strength__top">
              <span>
                Password strength
              </span>

              <strong>
                {strengthLabel}
              </strong>
            </div>

            <div className="settings-strength__bar">
              <span
                style={{
                  width: `${strength}%`,
                }}
              />
            </div>

            <small>
              Use 8+ characters,
              uppercase/lowercase
              letters, numbers and
              symbols.
            </small>
          </div>

          <div className="settings-actions">
            <button
              type="submit"
              className="settings-primary-button"
              disabled={pwBusy}
            >
              {pwBusy ? (
                <RefreshCw
                  className="settings-spin"
                  size={16}
                />
              ) : (
                <LockKeyhole
                  size={16}
                />
              )}

              {pwBusy
                ? "Updating..."
                : "Update password"}
            </button>
          </div>
        </form>
      </SectionCard>
    </motion.div>
  );
}

/* =========================================================
   RECOMMENDATION
   ========================================================= */

function Recommendation({
  done,
  icon: Icon,
  title,
  text,
}) {
  return (
    <motion.div
      className={`settings-recommendation ${
        done ? "is-done" : ""
      }`}
      whileHover={{ x: 3 }}
    >
      <div className="settings-recommendation__icon">
        <Icon size={17} />
      </div>

      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>

      <div className="settings-recommendation__status">
        {done ? (
          <CheckCircle2
            size={18}
          />
        ) : (
          <AlertTriangle
            size={17}
          />
        )}
      </div>
    </motion.div>
  );
}

/* =========================================================
   PREFERENCES
   ========================================================= */

function PreferencesTab({
  user,
  onSaved,
}) {
  const toast = useToast();

  const [values, setValues] =
    useState({
      theme:
        user?.preferences
          ?.theme ||
        getStoredTheme(),

      notifyOnLogin:
        user?.preferences
          ?.notifyOnLogin ??
        true,

      notifyOnTransfer:
        user?.preferences
          ?.notifyOnTransfer ??
        true,

      notifyOnFraud:
        user?.preferences
          ?.notifyOnFraud ??
        true,

      notifyOnProducts:
        user?.preferences
          ?.notifyOnProducts ??
        false,

      emailNotifications:
        user?.preferences
          ?.emailNotifications ??
        true,
    });

  const [busy, setBusy] =
    useState(false);

  useEffect(() => {
    const theme =
      user?.preferences
        ?.theme;

    if (theme) {
      setValues(
        (prev) => ({
          ...prev,
          theme,
        })
      );

      applyTheme(theme);
    }
  }, [user]);

  const toggle = (key) => {
    setValues(
      (prev) => ({
        ...prev,
        [key]: !prev[key],
      })
    );
  };

  const chooseTheme = (
    theme
  ) => {
    setValues(
      (prev) => ({
        ...prev,
        theme,
      })
    );

    applyTheme(theme);
  };

  const save = async () => {
    setBusy(true);

    try {
      const result =
        await authService.updatePreferences(
          values
        );

      const nextUser =
        result?.data?.user ||
        result?.data ||
        result?.user ||
        result;

      onSaved?.(nextUser);

      applyTheme(
        values.theme
      );

      toast.success(
        result?.message ||
          "Preferences saved."
      );
    } catch (error) {
      toast.error(
        error.message
      );
    } finally {
      setBusy(false);
    }
  };

  const items = [
    {
      key: "notifyOnLogin",
      title: "Login alerts",
      description:
        "Notify me when a new device signs in.",
      icon: ShieldCheck,
    },
    {
      key: "notifyOnTransfer",
      title: "Transfer alerts",
      description:
        "Notify me about completed transfers.",
      icon: Activity,
    },
    {
      key: "notifyOnFraud",
      title: "Fraud alerts",
      description:
        "Notify me when high-risk activity is detected.",
      icon: ShieldAlert,
    },
    {
      key: "notifyOnProducts",
      title: "Product updates",
      description:
        "Occasional news about NexusBank features.",
      icon: Sparkles,
    },
    {
      key: "emailNotifications",
      title: "Email delivery",
      description:
        "Deliver important alerts to your email.",
      icon: Mail,
    },
  ];

  return (
    <motion.div
      className="settings-stack"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <SectionCard
        icon={Palette}
        eyebrow="APPEARANCE"
        title="Make NexusBank yours"
        description="Choose how the banking experience should look."
      >
        <div className="settings-theme-grid">
          {[
            {
              id: "dark",
              label: "Dark",
              description:
                "Deep navy banking theme",
              icon: ShieldCheck,
            },
            {
              id: "light",
              label: "Light",
              description:
                "Bright clean interface",
              icon: Sparkles,
            },
            {
              id: "system",
              label: "System",
              description:
                "Follow your device setting",
              icon: Smartphone,
            },
          ].map(
            (option) => {
              const Icon =
                option.icon;

              return (
                <button
                  key={option.id}
                  type="button"
                  className={`settings-theme-card ${
                    values.theme ===
                    option.id
                      ? "is-selected"
                      : ""
                  }`}
                  onClick={() =>
                    chooseTheme(
                      option.id
                    )
                  }
                >
                  <div className="settings-theme-card__icon">
                    <Icon
                      size={19}
                    />
                  </div>

                  <strong>
                    {option.label}
                  </strong>

                  <span>
                    {
                      option.description
                    }
                  </span>

                  {values.theme ===
                    option.id && (
                    <CheckCircle2
                      className="settings-theme-card__check"
                      size={17}
                    />
                  )}
                </button>
              );
            }
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={Bell}
        eyebrow="NOTIFICATIONS"
        title="Stay informed"
        description="Control which banking events deserve your attention."
      >
        <div className="settings-toggle-list">
          {items.map(
            (item) => (
              <Toggle
                key={item.key}
                label={item.title}
                description={
                  item.description
                }
                checked={
                  values[
                    item.key
                  ]
                }
                onChange={() =>
                  toggle(
                    item.key
                  )
                }
                icon={item.icon}
              />
            )
          )}
        </div>
      </SectionCard>

      <div className="settings-actions">
        <button
          type="button"
          className="settings-primary-button"
          onClick={save}
          disabled={busy}
        >
          {busy ? (
            <RefreshCw
              className="settings-spin"
              size={16}
            />
          ) : (
            <Save size={16} />
          )}

          {busy
            ? "Saving..."
            : "Save preferences"}
        </button>
      </div>
    </motion.div>
  );
}

/* =========================================================
   IDENTITY
   ========================================================= */

function IdentityTab({
  user,
}) {
  const verified =
    Boolean(
      user?.verificationStatus ===
        "VERIFIED"
    );

  return (
    <motion.div
      className="settings-stack"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <SectionCard
        icon={IdCard}
        eyebrow="IDENTITY"
        title="Identity & KYC"
        description="Review the information associated with your NexusBank profile."
      >
        <div
          className={`settings-verification-banner ${
            verified
              ? "is-verified"
              : ""
          }`}
        >
          <div className="settings-verification-banner__icon">
            {verified ? (
              <CheckCircle2
                size={24}
              />
            ) : (
              <IdCard size={24} />
            )}
          </div>

          <div>
            <strong>
              {verified
                ? "Identity verified"
                : "Verification status available"}
            </strong>

            <span>
              {verified
                ? "Your account identity is marked as verified."
                : "Your current profile does not expose a verified KYC flag."}
            </span>
          </div>

          <span className="settings-status-pill">
            {verified
              ? "VERIFIED"
              : "ACTIVE"}
          </span>
        </div>

        <div className="settings-info-grid">
          <Info
            label="Full name"
            value={
              user?.name || "—"
            }
            icon={UserRound}
          />

          <Info
            label="Email"
            value={
              user?.email || "—"
            }
            icon={Mail}
          />

          <Info
            label="Phone"
            value={
              user?.phone || "—"
            }
            icon={
              Smartphone
            }
          />

          <Info
            label="Customer ID"
            value={
              user?.accountNumber ||
              "—"
            }
            icon={IdCard}
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={FileText}
        eyebrow="BANKING PROFILE"
        title="Account information"
        description="Basic information available from your authenticated profile."
      >
        <div className="settings-profile-summary">
          <div>
            <span>
              Customer since
            </span>

            <strong>
              {user?.createdAt
                ? formatDateTime(
                    user.createdAt
                  )
                : "—"}
            </strong>
          </div>

          <div>
            <span>
              Last login
            </span>

            <strong>
              {user?.lastLoginAt
                ? formatDateTime(
                    user.lastLoginAt
                  )
                : "—"}
            </strong>
          </div>

          <div>
            <span>
              Country
            </span>

            <strong>
              {user?.address
                ?.country ||
                "India"}
            </strong>
          </div>
        </div>
      </SectionCard>
    </motion.div>
  );
}

function Info({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="settings-info">
      <div className="settings-info__icon">
        <Icon size={16} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

/* =========================================================
   SESSIONS
   ========================================================= */

function SessionsTab() {
  const toast = useToast();

  const sessions =
    useApi(
      () =>
        authService.listSessions(),
      []
    );

  const [
    revoking,
    setRevoking,
  ] = useState(null);

  const revoke = async (
    id
  ) => {
    setRevoking(id);

    try {
      const result =
        await authService.revokeSession(
          id
        );

      toast.success(
        result?.message ||
          "Session signed out."
      );

      sessions.refetch();
    } catch (error) {
      toast.error(
        error.message
      );
    } finally {
      setRevoking(null);
    }
  };

  return (
    <motion.div
      className="settings-stack"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <SectionCard
        icon={Monitor}
        eyebrow="ACTIVE DEVICES"
        title="Your active sessions"
        description="See where your NexusBank account is currently signed in."
      >
        {sessions.loading ? (
          <div className="settings-skeleton-list">
            <div />
            <div />
            <div />
          </div>
        ) : sessions.error ? (
          <div className="settings-inline-error">
            <AlertTriangle size={16} />

            <span>
              {sessions.error.message}
            </span>

            <button
              type="button"
              onClick={
                sessions.refetch
              }
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="settings-session-list">
            {(sessions.data ||
              []).map(
              (session) => (
                <motion.div
                  key={
                    session._id
                  }
                  className="settings-session"
                  layout
                >
                  <div className="settings-session__device">
                    {String(
                      session.operatingSystem ||
                        ""
                    )
                      .toLowerCase()
                      .includes(
                        "win"
                      ) ? (
                      <Laptop
                        size={19}
                      />
                    ) : (
                      <Smartphone
                        size={19}
                      />
                    )}
                  </div>

                  <div className="settings-session__main">
                    <strong>
                      {session.browser ||
                        "Unknown browser"}{" "}
                      ·{" "}
                      {session.operatingSystem ||
                        "Unknown OS"}
                    </strong>

                    <span>
                      {session.deviceIdentifier ||
                        "device"}{" "}
                      · signed in{" "}
                      {formatDateTime(
                        session.createdAt
                      )}
                    </span>
                  </div>

                  {session.current ? (
                    <span className="settings-session__current">
                      <i /> This device
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="settings-danger-button"
                      onClick={() =>
                        revoke(
                          session._id
                        )
                      }
                      disabled={
                        revoking ===
                        session._id
                      }
                    >
                      {revoking ===
                      session._id ? (
                        <RefreshCw
                          className="settings-spin"
                          size={14}
                        />
                      ) : (
                        <LogOut
                          size={14}
                        />
                      )}

                      Sign out
                    </button>
                  )}
                </motion.div>
              )
            )}
          </div>
        )}
      </SectionCard>
    </motion.div>
  );
}

export default SettingsPage;