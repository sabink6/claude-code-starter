export const ADJECTIVES = [
  "Silent",
  "Sly",
  "Swift",
  "Clever",
  "Daring",
  "Quiet",
  "Sneaky",
  "Bold",
  "Cunning",
  "Nimble",
] as const

export const COLORS = [
  "Crimson",
  "Golden",
  "Emerald",
  "Violet",
  "Amber",
  "Onyx",
  "Silver",
  "Scarlet",
  "Cobalt",
  "Ivory",
] as const

export const NOUNS = [
  "Fox",
  "Raven",
  "Wolf",
  "Viper",
  "Falcon",
  "Panther",
  "Cobra",
  "Jackal",
  "Lynx",
  "Hawk",
] as const

export function generateCodename(random: () => number = Math.random): string {
  const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)]
  const color = COLORS[Math.floor(random() * COLORS.length)]
  const noun = NOUNS[Math.floor(random() * NOUNS.length)]

  return `${adjective}${color}${noun}`
}
