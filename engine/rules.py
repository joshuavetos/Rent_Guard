DEFAULTS = {
    "X_DAYS_LATE": 5,
    "Y_REPEAT": 2,
    # Z_WINDOW_DAYS reserved for future rolling-window logic
    "Z_WINDOW_DAYS": 90, 
    "Z_MAX_DELAY": 90,
    "N_PORTFOLIO_RATE": 0.40
}

ACTIVE = DEFAULTS.copy()

def configure(overrides):
    for k, v in overrides.items():
        if k in ACTIVE:
            ACTIVE[k] = v
