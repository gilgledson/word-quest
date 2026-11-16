import { beforeEach, describe, expect, it, vi } from "vitest";

const updater = vi.hoisted(() => ({
  current: vi.fn(),
  download: vi.fn(),
  next: vi.fn(),
  notifyAppReady: vi.fn(),
}));
const native = vi.hoisted(() => ({ on: true }));
vi.mock("@capgo/capacitor-updater", () => ({ CapacitorUpdater: updater }));
vi.mock("@capacitor/core", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@capacitor/core")>();
  return {
    ...mod,
    Capacitor: { ...mod.Capacitor, isNativePlatform: () => native.on },
  };
});

import {
  applies,
  checkLiveUpdate,
  confirmBundle,
  LIVE_UPDATE_URL,
  type LiveRelease,
} from "../services/liveUpdate";

const release: LiveRelease = {
  version: "5.3.20261117-1200",
  natives: ["5.3"],
  url: "https://wordquest-online.web.app/app/5.3.20261117-1200.zip",
  manifest: [
    {
      file_name: "index.html",
      file_hash: "abc",
      download_url:
        "https://wordquest-online.web.app/app/5.3.20261117-1200/index.html",
    },
  ],
};
const serve = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, json: async () => body });

beforeEach(() => {
  native.on = true;
  for (const f of Object.values(updater)) f.mockReset();
  updater.current.mockResolvedValue({
    bundle: { id: "builtin", version: "builtin" },
    native: "5.3",
  });
  updater.download.mockResolvedValue({ id: "b1", version: release.version });
  updater.next.mockResolvedValue({});
  updater.notifyAppReady.mockResolvedValue({});
});

describe("Quando um pacote vale para este aparelho", () => {
  it("só se for outra versão e servir para esta versão da loja", () => {
    expect(applies(release, { version: "builtin", native: "5.3" })).toBe(true);
    expect(applies(release, { version: release.version, native: "5.3" })).toBe(
      false,
    );
    // Pacote feito para a 5.3 não entra na 5.2 (pode depender de plugin nativo novo).
    expect(applies(release, { version: "builtin", native: "5.2" })).toBe(false);
    expect(applies(null, { version: "builtin", native: "5.3" })).toBe(false);
    expect(
      applies({ ...release, manifest: undefined } as unknown as LiveRelease, {
        version: "builtin",
        native: "5.3",
      }),
    ).toBe(false);
  });
});

describe("Conferência na abertura", () => {
  it("versão nova: baixa só pela lista de arquivos e deixa para a próxima abertura", async () => {
    const fetcher = serve(release);
    expect(await checkLiveUpdate(fetcher)).toBe("ready");
    expect(fetcher).toHaveBeenCalledWith(LIVE_UPDATE_URL, {
      cache: "no-store",
    });
    expect(updater.download).toHaveBeenCalledWith({
      url: release.url,
      version: release.version,
      manifest: release.manifest,
    });
    expect(updater.next).toHaveBeenCalledWith({ id: "b1" });
  });
  it("mesma versão, outra versão da loja ou sem publicação: não baixa nada", async () => {
    updater.current.mockResolvedValue({
      bundle: { id: "b1", version: release.version },
      native: "5.3",
    });
    expect(await checkLiveUpdate(serve(release))).toBe("current");
    updater.current.mockResolvedValue({
      bundle: { id: "builtin", version: "builtin" },
      native: "5.2",
    });
    expect(await checkLiveUpdate(serve(release))).toBe("current");
    expect(await checkLiveUpdate(serve(null, false))).toBe("offline");
    expect(updater.download).not.toHaveBeenCalled();
  });
  it("sem internet segue com a versão que tem; falha no download não troca nada", async () => {
    expect(
      await checkLiveUpdate(
        vi.fn().mockRejectedValue(new TypeError("offline")),
      ),
    ).toBe("offline");
    updater.download.mockRejectedValue(new Error("rede caiu"));
    expect(await checkLiveUpdate(serve(release))).toBe("failed");
    expect(updater.next).not.toHaveBeenCalled();
  });
  it("no navegador não faz nada; no app confirma que a versão abriu bem", async () => {
    await confirmBundle();
    expect(updater.notifyAppReady).toHaveBeenCalledOnce();
    native.on = false;
    const fetcher = serve(release);
    expect(await checkLiveUpdate(fetcher)).toBe("web");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
