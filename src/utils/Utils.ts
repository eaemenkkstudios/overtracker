export interface HashMap<T> {
  [key: string]: T;
}

class Utils {
  /**
   * Clones an object into a new one
   * @param obj The object to be cloned
   * @returns A new object with the same properties of the `obj` object
   */
  public cloneObject(obj: object): object {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Shuffles an array
   * @param arr The array to be shuffled
   * @returns The shuffled array
   */
  public shuffle<T>(arr: T[]): T[] {
    let i = arr.length;
    let temp;
    let rand;
    while (i !== 0) {
      rand = Math.floor(Math.random() * i);
      i -= 1;
      temp = arr[i];
      arr[i] = arr[rand];
      arr[rand] = temp;
    }
    return arr;
  }
}

export default new Utils();
