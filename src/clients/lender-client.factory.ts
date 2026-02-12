import { config } from "@/config";
import { type LenderClient, LenderName } from "@/models";
import { KarroFinClient } from "./lenders/karrofin.client";
import { PocketCreditClient } from "./lenders/pocketcredit.client";
import { ZypeClient } from "./lenders/zype.client";

export class LenderClientFactory {
    private static clients: Map<LenderName, LenderClient> = new Map();

    static getClient(lenderName: LenderName): LenderClient | null {
        if (LenderClientFactory.clients.has(lenderName)) {
            return LenderClientFactory.clients.get(lenderName)!;
        }

        const lenderConfig = config.lenders[lenderName];
        if (!lenderConfig || !lenderConfig.enabled) {
            return null;
        }

        let client: LenderClient;
        switch (lenderName) {
            case LenderName.KARROFIN:
                client = new KarroFinClient(lenderName, lenderConfig);
                break;
            case LenderName.POCKETCREDIT:
                client = new PocketCreditClient(lenderName, lenderConfig);
                break;
            case LenderName.ZYPE:
                client = new ZypeClient(lenderName, lenderConfig);
                break;
            default:
                return null;
        }

        LenderClientFactory.clients.set(lenderName, client);
        return client;
    }

    static getAllEnabledClients(): LenderClient[] {
        return Object.values(LenderName)
            .map((name) => LenderClientFactory.getClient(name))
            .filter((client): client is LenderClient => client !== null);
    }

    static clearClients(): void {
        LenderClientFactory.clients.clear();
    }
}
