import { describe, expect, it } from "vitest";
import { centerSquare } from "./avatar";

describe("recadrage de la photo de profil", () => {
  it("ne recadre pas une image déjà carrée", () => {
    expect(centerSquare(800, 800)).toBeNull();
  });

  it("centre le carré dans une image en paysage", () => {
    expect(centerSquare(4000, 3000)).toEqual({ originX: 500, originY: 0, width: 3000, height: 3000 });
  });

  it("centre le carré dans une image en portrait", () => {
    expect(centerSquare(3000, 4001)).toEqual({ originX: 0, originY: 500, width: 3000, height: 3000 });
  });

  it("ignore des dimensions inconnues ou invalides", () => {
    expect(centerSquare(0, 100)).toBeNull();
    expect(centerSquare(Number.NaN, 100)).toBeNull();
  });
});
