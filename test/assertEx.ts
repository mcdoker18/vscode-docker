import * as assert from 'assert';
import { parseError } from 'vscode-azureextensionui';

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

export function unorderedArraysEqual<T>(actual: T[], expected: T[], message?: string): void {
    isTrue(areUnorderedArraysEqual(actual, expected), `${message}\n  Actual: ${JSON.stringify(actual)}\n  Expected: ${JSON.stringify(expected)}`);
}

export function notUnorderedArraysEqual<T>(array1: T[], array2: T[], message?: string): void {
    isFalse(areUnorderedArraysEqual(array1, array2), message);
}

export async function throwsOrRejectsAsync(block: () => Promise<any>, expected: {}, message?: string): Promise<void> {
    let error: any;
    try {
        await block();
    } catch (err) {
        error = err;
    }

    if (!error) {
        throw new Error(`Expected exception or rejection: ${parseError(expected).message}`);
    }
    for (let prop of Object.getOwnPropertyNames(expected)) {
        assert.equal(error[prop], expected[prop], `Error did not have the expected value for property '${prop}'`);
    }
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

    suite("throwsAsync", () => {
        test("throws", async () => {
            await throwsOrRejectsAsync(async () => {
                throw new Error("this is an error");
            },
                {
                    message: "this is an error"
                }
            );
        });

        test("rejects", async () => {
            await throwsOrRejectsAsync((): Promise<void> => {
                return Promise.reject(new Error("This is a rejection. Don't take it personally."));
            },
                {
                    message: "This is a rejection. Don't take it personally."
                }
            );
        });

        test("wrong message", async () => {
            let error: any;
            try {
                await throwsOrRejectsAsync((): Promise<void> => {
                    throw new Error("this is an error");
                },
                    {
                        message: "I'm expecting too much"
                    }
                );
            } catch (err) {
                error = err;
            }

            assert.equal(error && error.message, "Error did not have the expected value for property 'message'");
        });

        test("fails", async () => {
            let error: any;
            try {
                await throwsOrRejectsAsync((): Promise<void> => {
                    return Promise.resolve();
                },
                    {
                        message: "This is a rejection. Don't take it personally."
                    }
                );
            } catch (err) {
                error = err;
            }

            assert.equal(error && error.message, "Expected exception or rejection: This is a rejection. Don't take it personally.");
        })
    });
});
