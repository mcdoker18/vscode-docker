import * as assert from 'assert';

export function isTrue<T>(f: boolean, message?: string): void {
    assert.ok(f === true, message);
}

export function isFalse<T>(f: boolean, message?: string): void {
    assert.ok(f === false, message);
}

export function isTruthy<T>(f: any, message?: string): void {
    assert.ok(f, message);
}

export function isFalsey<T>(f: any, message?: string): void {
    assert.ok(!f, message);
}

function areUnorderedArraysEqual<T>(array1: T[], array2: T[]): boolean {
    if (!(array1.length === array2.length)) {
        return false;
    }

    array1 = array1.slice();
    array2 = array2.slice();
    array1.sort();
    array2.sort();

    for (let i = 0; i < array1.length; ++i) {
        if (array1[i] !== array2[i]) {
            return false;
        }
    }

    return true;
}

export function unorderedArraysEqual<T>(array1: T[], array2: T[], message?: string): void {
    isTrue(areUnorderedArraysEqual(array1, array2), message);
}

export function notUnorderedArraysEqual<T>(array1: T[], array2: T[], message?: string): void {
    isFalse(areUnorderedArraysEqual(array1, array2), message);
}

suite("assertEx", () => {
    test("areUnorderedArraysEqual", () => {
        isTrue(areUnorderedArraysEqual([], []));
        isFalse(areUnorderedArraysEqual([], [1]));
        isTrue(areUnorderedArraysEqual([1], [1]));
        isFalse(areUnorderedArraysEqual([1], [1, 2]));
        isTrue(areUnorderedArraysEqual([1, 2], [1, 2]));
        isTrue(areUnorderedArraysEqual([1, 2], [2, 1]));
        isFalse(areUnorderedArraysEqual([1, 2], [2, 1, 3]));
    });
});
