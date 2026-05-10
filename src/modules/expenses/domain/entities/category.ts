export type Category = {
  id?: number
  name: string
  /** Hex color string used to tint the tap button and widget. e.g. "#4CAF50" */
  color_hex: string
  /** MaterialCommunityIcons icon name displayed on the category disc. */
  icon: string
  /** True for Tapp-seeded categories; false for user-created ones. */
  is_system: boolean
  /** Optional default amount (in smallest currency unit) pre-filled on tap. */
  default_amount?: number | null
}
