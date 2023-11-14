/**
 * Generates a random number starting at `from` until, but __not including__
 * `to`
 * @function    randomNumber
 * @param       {number}    from
 * @param       {number}    to
 * @returns     {number}
 */
export function randomNumber(from: number, to: number): number {
    const randomNumber = Math.random() * (to - from) + from;
    return Math.floor(randomNumber);
}
