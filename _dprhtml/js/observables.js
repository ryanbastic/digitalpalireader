// Simple reactive state management (replaces knockout observables)

export function createObservable(initialValue) {
	let value = initialValue;
	const subscribers = new Set();

	const observable = {
		get() {
			return value;
		},
		set(newValue) {
			if (value !== newValue) {
				value = newValue;
				subscribers.forEach((fn) => fn(newValue));
			}
		},
		subscribe(fn) {
			subscribers.add(fn);
			return () => subscribers.delete(fn);
		},
	};

	// Make it callable like knockout for compatibility
	const fn = function (newValue) {
		if (arguments.length === 0) {
			return observable.get();
		}
		observable.set(newValue);
	};
	fn.get = observable.get;
	fn.set = observable.set;
	fn.subscribe = observable.subscribe;

	return fn;
}

export function createComputed(computeFn, dependencies) {
	const subscribers = new Set();
	let cachedValue = computeFn();

	const recompute = () => {
		const newValue = computeFn();
		if (cachedValue !== newValue) {
			cachedValue = newValue;
			subscribers.forEach((fn) => fn(newValue));
		}
	};

	// Subscribe to all dependencies
	dependencies.forEach((dep) => dep.subscribe(recompute));

	const computed = {
		get() {
			return cachedValue;
		},
		subscribe(fn) {
			subscribers.add(fn);
			return () => subscribers.delete(fn);
		},
	};

	// Make it callable like knockout for compatibility
	const fn = function () {
		return computed.get();
	};
	fn.get = computed.get;
	fn.subscribe = computed.subscribe;

	return fn;
}

export function createObservableArray(initialArray = []) {
	let array = Array.isArray(initialArray) ? [...initialArray] : [initialArray];
	const subscribers = new Set();

	const notify = () => {
		subscribers.forEach((fn) => fn(array));
	};

	const observableArray = {
		get() {
			return array;
		},
		set(newValue) {
			// Handle non-array values by wrapping in array, or use empty array for null/undefined
			if (newValue == null) {
				array = [];
			} else if (Array.isArray(newValue)) {
				array = [...newValue];
			} else {
				array = [newValue];
			}
			notify();
		},
		subscribe(fn) {
			subscribers.add(fn);
			return () => subscribers.delete(fn);
		},
		push(...items) {
			array.push(...items);
			notify();
			return array.length;
		},
		pop() {
			const result = array.pop();
			notify();
			return result;
		},
		shift() {
			const result = array.shift();
			notify();
			return result;
		},
		unshift(...items) {
			const result = array.unshift(...items);
			notify();
			return result;
		},
		splice(start, deleteCount, ...items) {
			const result = array.splice(start, deleteCount, ...items);
			notify();
			return result;
		},
		remove(item) {
			const index = array.indexOf(item);
			if (index > -1) {
				array.splice(index, 1);
				notify();
			}
		},
		removeAll() {
			array = [];
			notify();
		},
		indexOf(item) {
			return array.indexOf(item);
		},
		replace(oldItem, newItem) {
			const index = array.indexOf(oldItem);
			if (index > -1) {
				array[index] = newItem;
				notify();
			}
		},
	};

	// Make it callable like knockout for compatibility
	const fn = function (newArray) {
		if (arguments.length === 0) {
			return observableArray.get();
		}
		observableArray.set(newArray);
	};
	fn.get = observableArray.get;
	fn.set = observableArray.set;
	fn.subscribe = observableArray.subscribe;
	fn.push = observableArray.push;
	fn.pop = observableArray.pop;
	fn.shift = observableArray.shift;
	fn.unshift = observableArray.unshift;
	fn.splice = observableArray.splice;
	fn.remove = observableArray.remove;
	fn.removeAll = observableArray.removeAll;
	fn.indexOf = observableArray.indexOf;
	fn.replace = observableArray.replace;

	return fn;
}

export function createWritableComputed(options) {
	const { read, write, owner } = options;
	const subscribers = new Set();
	let cachedValue = read.call(owner);

	const recompute = () => {
		const newValue = read.call(owner);
		if (cachedValue !== newValue) {
			cachedValue = newValue;
			subscribers.forEach((fn) => fn(newValue));
		}
	};

	const computed = {
		get() {
			return cachedValue;
		},
		set(newValue) {
			write.call(owner, newValue);
			recompute();
		},
		subscribe(fn) {
			subscribers.add(fn);
			return () => subscribers.delete(fn);
		},
		recompute,
	};

	// Make it callable like knockout for compatibility
	const fn = function (newValue) {
		if (arguments.length === 0) {
			return computed.get();
		}
		computed.set(newValue);
	};
	fn.get = computed.get;
	fn.set = computed.set;
	fn.subscribe = computed.subscribe;
	fn.recompute = computed.recompute;

	return fn;
}
