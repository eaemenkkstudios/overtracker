export interface HashMap<T> {
  [key: string]: T;
}

class Utils {
  public cloneObject(obj: object): object {
    return JSON.parse(JSON.stringify(obj));
  }
}

export default new Utils();
