// Registro de comandos. Para agregar uno: crear su módulo en esta carpeta (exporta un `Command`,
// ver `../cli/types.ts`) e importarlo y sumarlo a la lista. El despachador y el resto del núcleo no
// se tocan.

import type { Command } from "../cli/types.ts";
import { add } from "./add.ts";
import { anchors } from "./anchors.ts";
import { next } from "./next.ts";
import { pause } from "./pause.ts";
import { resume } from "./resume.ts";
import { show } from "./show.ts";
import { start } from "./start.ts";
import { status } from "./status.ts";
import { step } from "./step.ts";
import { whoami } from "./whoami.ts";

export const COMMANDS: Command[] = [whoami, anchors, status, next, show, add, start, step, pause, resume];
