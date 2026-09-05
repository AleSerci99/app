import { Feather } from "@react-native-vector-icons/feather";
import type { ComponentProps } from "react";

type FeatherProps = ComponentProps<typeof Feather>;

export function Icon({ name, size = 20, color, style }: {
  name: FeatherProps["name"];
  size?: number;
  color: string;
  style?: FeatherProps["style"];
}) {
  return <Feather name={name} size={size} color={color} style={style} />;
}
