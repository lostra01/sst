export function debug(...args) {
    if (process.env.SST_DEBUG) {
        console.log(...args.map((arg) => JSON.stringify(arg, null, 2)));
    }
}
