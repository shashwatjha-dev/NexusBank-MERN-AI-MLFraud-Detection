import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { FILTER_CHIPS } from "../../services/statementsService";


/* ============================================================
   Helpers
   ============================================================ */

const GROUP_META = {
  time: {
    label: "Time",
    icon: "◷",
  },
  direction: {
    label: "Money flow",
    icon: "↕",
  },
  status: {
    label: "Status",
    icon: "✓",
  },
  amount: {
    label: "Amount",
    icon: "₹",
  },
  risk: {
    label: "Risk",
    icon: "◈",
  },
};


function getChipIcon(chip) {
  const icons = {
    today: "●",
    this_week: "◷",
    last_7: "7",
    last_30: "30",
    this_month: "M",
    last_month: "M",
    last_90: "90",
    this_calendar: "Y",
    this_fy: "FY",

    credits: "↓",
    debits: "↑",
    refunds: "↩",

    completed: "✓",
    pending: "◌",
    failed_blocked: "!",

    amount_10k: "₹",
    amount_50k: "₹",

    risk_high: "!",
    risk_low: "✓",
  };

  return icons[chip.id] || "•";
}


/* ============================================================
   Smart Filters
   ============================================================ */

export default function SmartFilters({
  active = [],
  onToggle,
  onClear,
}) {
  const scrollRef = useRef(null);

  const activeSet = useMemo(
    () => new Set(active),
    [active]
  );

  const activeTimeFilter = useMemo(
    () =>
      active.find((id) =>
        FILTER_CHIPS.some(
          (chip) =>
            chip.id === id &&
            chip.group === "time"
        )
      ),
    [active]
  );


  /* ----------------------------------------------------------
     Group chips
     ---------------------------------------------------------- */

  const groups = useMemo(() => {
    const map = new Map();

    FILTER_CHIPS.forEach((chip) => {
      if (!map.has(chip.group)) {
        map.set(chip.group, []);
      }

      map.get(chip.group).push(chip);
    });

    return Array.from(map.entries());
  }, []);


  /* ----------------------------------------------------------
     Scroll helper
     ---------------------------------------------------------- */

  const scrollFilters = (direction) => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollBy({
      left: direction * 280,
      behavior: "smooth",
    });
  };


  /* ----------------------------------------------------------
     Active filter information
     ---------------------------------------------------------- */

  const activeCount = active.length;

  const activeLabels = FILTER_CHIPS
    .filter((chip) => activeSet.has(chip.id))
    .map((chip) => chip.label);


  return (
    <motion.section
      className="stmt-smart-filter-box"
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
      data-testid="statement-smart-filters"
    >

      {/* ======================================================
          HEADER
         ====================================================== */}

      <div className="stmt-smart-filter__header">

        <div className="stmt-smart-filter__title">

          <div className="stmt-smart-filter__icon">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M4 5h16" />
              <path d="M7 12h10" />
              <path d="M10 19h4" />
            </svg>
          </div>

          <div>
            <span className="stmt-smart-filter__eyebrow">
              Smart filters
            </span>

            <strong>
              Refine your statement
            </strong>
          </div>

        </div>


        {/* Active count / clear */}

        <div className="stmt-smart-filter__header-actions">

          {activeCount > 0 && (
            <motion.span
              className="stmt-smart-filter__count"
              initial={{
                scale: 0.7,
                opacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
            >
              {activeCount} active
            </motion.span>
          )}

          {activeCount > 0 && (
            <motion.button
              type="button"
              className="stmt-smart-filter__clear"
              whileTap={{
                scale: 0.95,
              }}
              onClick={onClear}
              data-testid="stmt-chips-clear"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M5 6l1 15h12l1-15" />
              </svg>

              Clear all
            </motion.button>
          )}

        </div>
      </div>


      {/* ======================================================
          ACTIVE FILTER SUMMARY
         ====================================================== */}

      {activeCount > 0 && (
        <motion.div
          className="stmt-smart-filter__active"
          initial={{
            opacity: 0,
            height: 0,
            y: -4,
          }}
          animate={{
            opacity: 1,
            height: "auto",
            y: 0,
          }}
          transition={{
            duration: 0.2,
          }}
        >

          <span className="stmt-smart-filter__active-label">
            Active
          </span>

          <div className="stmt-smart-filter__active-list">
            {activeLabels.map((label) => (
              <span
                key={label}
                className="stmt-smart-filter__active-chip"
              >
                {label}
              </span>
            ))}
          </div>

        </motion.div>
      )}


      {/* ======================================================
          NAVIGATION
         ====================================================== */}

      <div className="stmt-smart-filter__navigation">

        <button
          type="button"
          className="stmt-smart-filter__arrow"
          onClick={() => scrollFilters(-1)}
          aria-label="Scroll filters left"
        >
          ‹
        </button>


        {/* ====================================================
            CHIP AREA
           ==================================================== */}

        <div
          ref={scrollRef}
          className="stmt-smart-filter__scroll"
        >

          {groups.map(
            ([groupName, chips]) => {
              const meta =
                GROUP_META[groupName] || {
                  label: groupName,
                  icon: "•",
                };

              return (
                <div
                  key={groupName}
                  className="stmt-smart-filter__group"
                >

                  <div className="stmt-smart-filter__group-label">
                    <span>
                      {meta.icon}
                    </span>

                    {meta.label}
                  </div>


                  <div className="stmt-smart-filter__chips">

                    {chips.map((chip) => {
                      const isActive =
                        activeSet.has(
                          chip.id
                        );

                      const isTime =
                        chip.group ===
                        "time";

                      const isOtherTimeActive =
                        isTime &&
                        Boolean(
                          activeTimeFilter
                        ) &&
                        activeTimeFilter !==
                          chip.id;

                      return (
                        <motion.button
                          key={chip.id}
                          type="button"
                          whileTap={{
                            scale: 0.94,
                          }}
                          whileHover={{
                            y: -1,
                          }}
                          className={[
                            "stmt-smart-chip",
                            isActive
                              ? "stmt-smart-chip--active"
                              : "",
                            isOtherTimeActive
                              ? "stmt-smart-chip--dimmed"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() =>
                            onToggle(chip)
                          }
                          aria-pressed={
                            isActive
                          }
                          data-testid={`stmt-chip-${chip.id}`}
                        >

                          <span className="stmt-smart-chip__icon">
                            {getChipIcon(
                              chip
                            )}
                          </span>

                          <span>
                            {chip.label}
                          </span>

                          {isActive && (
                            <motion.span
                              className="stmt-smart-chip__check"
                              initial={{
                                scale: 0,
                                rotate:
                                  -30,
                              }}
                              animate={{
                                scale: 1,
                                rotate: 0,
                              }}
                            >
                              ✓
                            </motion.span>
                          )}

                        </motion.button>
                      );
                    })}

                  </div>
                </div>
              );
            }
          )}

        </div>


        <button
          type="button"
          className="stmt-smart-filter__arrow"
          onClick={() => scrollFilters(1)}
          aria-label="Scroll filters right"
        >
          ›
        </button>

      </div>


      {/* ======================================================
          FOOTER HINT
         ====================================================== */}

      <div className="stmt-smart-filter__footer">

        <span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
            />
            <path d="M12 8v4l2.5 2.5" />
          </svg>

          Combine filters to narrow your
          results
        </span>

        <span>
          {activeCount === 0
            ? "No filters applied"
            : `${activeCount} filter${
                activeCount > 1
                  ? "s"
                  : ""
              } applied`}
        </span>

      </div>

    </motion.section>
  );
}