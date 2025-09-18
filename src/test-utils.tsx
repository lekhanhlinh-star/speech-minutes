import * as React from "react"
import { render, RenderOptions } from "@testing-library/react"
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react"

const system = createSystem(defaultConfig)

const AllProviders = ({ children }: { children?: React.ReactNode }) => (
  <ChakraProvider value={system}>{children}</ChakraProvider>
)

const customRender = (ui: React.ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllProviders, ...options })

export { customRender as render }
