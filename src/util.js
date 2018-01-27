export const match = (getKey, map, getDefault = () => null) => (value) => {
    const key = getKey(value)
    return map[key] ? map[key](value) : getDefault(value, key)
}
