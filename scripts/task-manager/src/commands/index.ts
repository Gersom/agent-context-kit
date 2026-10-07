// Registro de comandos. Para agregar uno: crear su módulo en esta carpeta (exporta un `Command`,
// ver `../cli/types.ts`) e importarlo y sumarlo a la lista. El despachador y el resto del núcleo no
// se tocan.

import type { Command } from "../cli/types.ts";
import { anchors } from "./anchors.ts";
import { next } from "./next.ts";
import { show } from "./show.ts";
import { status } from "./status.ts";
import { whoami } from "./whoami.ts";

export const COMMANDS: Command[] = [whoami, anchors, status, next, show];
