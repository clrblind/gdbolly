
export const normalizeAddress = (addr) => {
    if (!addr) return null;
    try {
        // Handle "0x" prefix or absence
        // BigInt will handle stripping leading zeros naturally
        const big = BigInt(addr);
        return '0x' + big.toString(16).toLowerCase();
    } catch (e) {
        // Fallback for non-numeric (e.g. invalid input, though unlikely in internal logic)
        return addr ? addr.toString().toLowerCase() : null;
    }
};

export const offsetAddress = (addr, offset) => {
    try {
        const big = BigInt(addr);
        const off = BigInt(offset);
        let res = big + off;
        if (res < 0n) res = 0n;
        return '0x' + res.toString(16).toLowerCase();
    } catch(e) {
        return addr;
    }
};
