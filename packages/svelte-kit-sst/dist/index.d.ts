import type { Builder } from "@sveltejs/kit/types";
export default function (): {
    name: string;
    adapt(builder: Builder): Promise<void>;
};
