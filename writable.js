/**
 * @template T
 * @callback Listener
 * @param {T} value
 */

/**
 * @callback Unsubscribe
 * @returns {void}
 */

/**
 * @template T
 * @callback Subscribe
 * @param {Listener<T>} callback
 * @returns {Unsubscribe} unsubscribe
 */

/**
 * @template T
 * @callback Setter
 * @param {T} value 
 * @returns {T}
 */

/**
 * @template T
 * @callback SetFunc
 * @param {T | Setter<T>} value
 */

/**
 * @template T
 * @typedef Writable
 * @property {Subscribe<T>} subscribe
 * @property {SetFunc<T>} set
 */

/**
 * @template T
 * @param {T} value 
 * @returns {Writable<T>}
 */
export const writable = value => {
    const subscribers = new Set();

    const subscribe = cb => {
        subscribers.add(cb);
        cb(value);
        return () => subscribers.delete(cb);
    }

    let isUpdate = false;

    const set = v => {
        if (isUpdate) return;
        isUpdate = true;
        if (typeof v === 'function') {
            v = v(value);
        }
        if (v === value) {
            isUpdate = false;
            return;
        }
        value = v;
        subscribers.forEach(cb => cb(value));
        isUpdate = false;
    }

    return { subscribe, set };
};