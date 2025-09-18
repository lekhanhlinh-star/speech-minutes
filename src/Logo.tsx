import * as React from "react"
import {
  chakra,
  ImageProps,
} from "@chakra-ui/react"
import logo from "./logo.svg"

export const Logo = React.forwardRef<HTMLImageElement, ImageProps>((props: ImageProps, ref) => {
  return <chakra.img src={logo} ref={ref} {...props} />
})
