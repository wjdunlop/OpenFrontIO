import data from "../../../../bot-behaviors/default.json";
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
