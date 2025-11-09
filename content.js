let origObjectDefineProperty
function patchedObjectDefineProperty(...args) {
	const [obj, prop, desc] = args
	
	const curr = Object.getOwnPropertyDescriptor(obj, prop)
	if (!curr) {
		return origObjectDefineProperty.apply(this, args)
	}
	
	if (prop === 'css' && obj === window.jQuery.fn) {
		if ('value' in curr && 'value' in desc) return
		if ('get' in curr && 'get' in desc) return
	}
	
	return origObjectDefineProperty.apply(this, args)
}
function patchObjectDefineProperty() {
	origObjectDefineProperty = Object.defineProperty
	Object.defineProperty = patchedObjectDefineProperty
}
function restoreObjectDefineProperty() {
	Object.defineProperty = origObjectDefineProperty
	origObjectDefineProperty = null
}

let origCssFn
function patchedCssFn(...args) {
	const [prop, value] = args
	if (prop === 'color' && value === '') {
		const isSpan = el => el.tagName && el.tagName === 'SPAN'
		if (Array.prototype.every.call(this, isSpan)) {
			return this // ignore the call
		}
	}
	return origCssFn.apply(this, args)
}
function patchCssFn(jq) {
	origCssFn = jq.fn.css
	Object.defineProperty(jq.fn, 'css', {
		get() {
			return patchedCssFn
		},
		set(v) {
			origCssFn = v
		},
		configurable: true,
	})
	patchObjectDefineProperty()
}
function restoreCssFn(jq) {
	Object.defineProperty(jq.fn, 'css', {
		value: origCssFn,
	})
}

// workflow:
// 1. patch window.jQuery to detect setting window.jQuery
// 2. when set, patch jQuery.fn.css
// 3. after patching is done, patch Object.defineProperty to block jQuery restoring original function
// 4. after color revision is (unsuccessfully) done, restore everything to minimize side effects

Object.defineProperty(window, 'jQuery', {
	get() {
		return undefined
	},
	set(jq) {
		Object.defineProperty(window, 'jQuery', { value: jq })
		patchCssFn(jq)
	},
	configurable: true,
})
window.addEventListener('load', () => {
	if (document.readyState !== 'complete') return
	
	setTimeout(() => {
		restoreObjectDefineProperty()
		if (origCssFn) {
			restoreCssFn(window.jQuery)
		}
	}, 0) // restore everything after other event listeners are executed
})
