import * as React from "react"
import {
  IconButton,
  IconButtonProps,
} from "@chakra-ui/react"
import { FaMoon } from "react-icons/fa"

type ColorModeSwitcherProps = Omit<IconButtonProps, "aria-label">

export const ColorModeSwitcher: React.FC<ColorModeSwitcherProps> = (props) => {
  return (
    <IconButton
      size="md"
      fontSize="lg"
      variant="ghost"
      color="current"
      marginLeft="2"
      aria-label="Color mode switcher"
      {...props}
    >
      <FaMoon />
    </IconButton>
  )
}
