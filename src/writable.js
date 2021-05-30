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
 * @callback Updater
 * @param {T} value 
 * @returns {T}
 */

/**
 * @template T
 * @callback SetFunc
 * @param {T | Updater<T>} value
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
    /** @type {Set<Listener<T>} */
    const subscribers = new Set();
    let isUpdate = false;

    /** @type {Subscribe<T>} */
    const subscribe = cb => {
        subscribers.add(cb);
        if (!isUpdate) {
            isUpdate = true;
            cb(value);
            isUpdate = false;
        }
        return () => subscribers.delete(cb);
    };

    /** @type {SetFunc<T>} */
    const set = newValue => {
        if (isUpdate) return;
        isUpdate = true;
        if (typeof newValue === 'function') {
            newValue = newValue(value);
        }
        if (newValue !== value) {
            value = newValue;
            subscribers.forEach(cb => cb(value));
        }
        isUpdate = false;
    };

    return { subscribe, set };
};