class Promise {
  constructor(executor) {
    this.status = "pending";
    this.value = undefined;
    this.reason = undefined;
    this.onResolvedCallbacks = [];
    this.onRejectedCallbacks = [];

    this.resolve = data => {
      if (this.status === "pending") {
        this.status = "fulfilled";
        this.value = data;

        this.onResolvedCallbacks.forEach(fn => {
          fn();
        });
      }
    };

    this.reject = reason => {
      if (this.status === "pending") {
        this.status = "rejected";
        this.reason = reason;

        this.onRejectedCallbacks.forEach(fn => {
          fn();
        });
      }
    };

    try {
      executor(this.resolve, this.reject);
    } catch (e) {
      reject(e);
    }
  }

  then(onFulfilled = data => data, onRejected = err => err) {
    const promise2 = new Promise((resolve, reject) => {
      ({
        fulfilled: () => {
          setTimeout(() => {
            try {
              const res = onFulfilled(this.value);
              resolvePromise(promise2, res, resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
        },
        rejected: () => {
          setTimeout(() => {
            try {
              const res = onRejected(this.reason);
              resolvePromise(promise2, res, resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
        },
        pending: () => {
          this.onResolvedCallbacks.push(() => {
            setTimeout(() => {
              try {
                const res = onFulfilled(this.value);
                resolvePromise(promise2, res, resolve, reject);
              } catch (e) {
                reject(e);
              }
            });
          });

          this.onRejectedCallbacks.push(() => {
            setTimeout(() => {
              try {
                const res = onRejected(this.reason);
                resolvePromise(promise2, res, resolve, reject);
              } catch (e) {
                reject(e);
              }
            });
          });
        }
      }[this.status]());
    });

    return promise2;
  }

  catch(errCallback) {
    return this.then(null, errCallback);
  }

  finally(callback) {
    return this.then(
      () => {
        callback();
      },
      () => {
        callback();
      }
    );
  }

  static resolve(value) {
    return new Promise((resolve, reject) => resolve(value));
  }

  static reject(reason) {
    return new Promise((resolve, reject) => reject(reason));
  }

  static deferred() {
    const dfd = {};
    dfd.promise = new Promise((resolve, reject) => {
      dfd.resolve = resolve;
      dfd.reject = reject;
    });

    return dfd;
  }

  static all(promises) {
    return new Promise((resolve, reject) => {
      const arr = [];
      let i = 0;
      const processData = (index, data) => {
        i++;
        arr[index] = data;
        if (arr.length === promises.length) {
          resolve(arr);
        }
      };

      for (let i = 0, len = promises.length; i < len; i++) {
        const current = promises[i];
        if (typeof current === "object" && current.then) {
          current.then(data => {
            processData(i, data);
          }, reject);
        } else {
          processData(i, current);
        }
      }
    });
  }

  static race(promises) {
    return new Promise((resolve, reject) => {
      for (let i = 0, len = promises.length; i < len; i++) {
        const current = promises[i];
        if (typeof current === "object" && current.then) {
          current.then(resolve, reject);
        } else {
          resolve(current);
        }
      }
    });
  }
}

const resolvePromise = (promiseResult, res, resolve, reject) => {
  if (promiseResult === res) {
    return reject(new TypeError("循环----引用"));
  }

  let called;
  if ((typeof res === "object" && res !== null) || typeof res === "function") {
    try {
      const then = res.then;
      if (typeof then === "function") {
        then.call(
          res,
          v => {
            if (called) return;
            called = true;
            resolvePromise(promiseResult, v, resolve, reject);
          },
          e => {
            if (called) return;
            called = true;
            reject(e);
          }
        );
      } else {
        resolve(res);
      }
    } catch (e) {
      if (called) return;
      called = true;
      reject(e);
    }
  } else {
    resolve(res);
  }
};

module.exports = Promise;
