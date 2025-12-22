DEFAULTS = {
    "X_DAYS_LATE": 5,
    "Y_REPEAT": 2,
    "Z_WINDOW_DAYS": 90,
    "Z_MAX_DELAY": 90,
    "N_PORTFOLIO_RATE_MILLI": 400,  # 0.400 expressed as milli-rate
}

ACTIVE = DEFAULTS.copy()

def configure(overrides):
    for k, v in overrides.items():
        if k in ACTIVE:
            ACTIVE[k] = v
