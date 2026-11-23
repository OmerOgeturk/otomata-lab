EPSILON = "ε"
_EPSILON_ALIASES = {"", "ε", "eps", "epsilon", "λ", "lambda"}


class AutomatonError(ValueError):
    pass


def is_epsilon(symbol: str) -> bool:
    return symbol.strip().lower() in _EPSILON_ALIASES


def norm(symbol: str) -> str:
    return "" if is_epsilon(symbol) else symbol.strip()


def show(symbol: str) -> str:
    return symbol if symbol else EPSILON


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AutomatonError(message)


def check_states(states, start_state, accept_states, transitions, label="Geçiş") -> None:
    state_set = set(states)
    require(len(state_set) > 0, "En az bir durum tanımlanmalı.")
    require(len(state_set) == len(states), "Durum adları benzersiz olmalı.")
    require(start_state in state_set, f"Başlangıç durumu '{start_state}' durum listesinde yok.")
    for s in accept_states:
        require(s in state_set, f"Kabul durumu '{s}' durum listesinde yok.")
    for t in transitions:
        require(t.from_ in state_set, f"{label} kaynağı '{t.from_}' durum listesinde yok.")
        require(t.to in state_set, f"{label} hedefi '{t.to}' durum listesinde yok.")
