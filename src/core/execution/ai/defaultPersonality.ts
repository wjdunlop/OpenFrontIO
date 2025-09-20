import data from "../../../../bot-behaviors/default.json";
import { PseudoRandom } from "../../PseudoRandom";
import {
  FakeHumanPersonality,
  FakeHumanPersonalityCatalog,
  FakeHumanPersonalityFileSpec,
} from "./FakeHumanPersonality";

const catalog = FakeHumanPersonalityCatalog.fromSpecFile(
  data as FakeHumanPersonalityFileSpec,
);

export function getFakeHumanPersonality(id: string): FakeHumanPersonality {
  return catalog.get(id);
}

export function getDefaultFakeHumanPersonality(): FakeHumanPersonality {
  return catalog.get("default");
}

export function availableFakeHumanPersonalities(): string[] {
  return catalog.ids();
}

export function randomFakeHumanPersonalityId(random: PseudoRandom): string {
  const ids = catalog.ids();
  if (ids.length === 0) {
    return "default";
  }
  const index = random.nextInt(0, ids.length);
  return ids[index];
}
