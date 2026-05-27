import { r as __toESM } from "./chunk-CYJPkc-J.js";
import { t as require_react } from "./react.js";
import { t as require_react_dom } from "./react-dom-0R_uKCUX.js";
import { Ot as useForceUpdate, jt as useDidUpdate, qt as randomId, st as useReducedMotion, t as useDrag, vt as useMergedRef } from "./esm-DhakALxu.js";
import { Aa as factory, Es as rem, Ha as useStyles, Ko as createVarsResolver, Nt as Notification, Oa as Box, Pa as getStyleObject, Ya as useProps, _s as getDefaultZIndex, fa as OptionalPortal, oo as useMantineTheme, qi as ReactRemoveScroll } from "./esm-BMQK9ICc.js";
import { t as require_jsx_runtime } from "./jsx-runtime-BN7xj8-T.js";
import { t as require_prop_types } from "./prop-types-DQqhlLYA.js";
//#region node_modules/@mantine/store/esm/store.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
function createStore(initialState) {
	let state = initialState;
	let initialized = false;
	const listeners = /* @__PURE__ */ new Set();
	return {
		getState() {
			return state;
		},
		updateState(value) {
			state = typeof value === "function" ? value(state) : value;
		},
		setState(value) {
			this.updateState(value);
			listeners.forEach((listener) => listener(state));
		},
		initialize(value) {
			if (!initialized) {
				state = value;
				initialized = true;
			}
		},
		subscribe(callback) {
			listeners.add(callback);
			return () => listeners.delete(callback);
		}
	};
}
function useStore(store) {
	return (0, import_react.useSyncExternalStore)(store.subscribe, () => store.getState(), () => store.getState());
}
//#endregion
//#region node_modules/@mantine/notifications/esm/notifications.store.mjs
function getDistributedNotifications(data, defaultPosition, limit) {
	const queue = [];
	const notifications = [];
	const count = {};
	for (const item of data) {
		const position = item.position || defaultPosition;
		count[position] = count[position] || 0;
		count[position] += 1;
		if (count[position] <= limit) notifications.push(item);
		else queue.push(item);
	}
	return {
		notifications,
		queue
	};
}
var createNotificationsStore = () => createStore({
	notifications: [],
	queue: [],
	defaultPosition: "bottom-right",
	limit: 5
});
var notificationsStore = createNotificationsStore();
var useNotifications = (store = notificationsStore) => useStore(store);
function updateNotificationsState(store, update) {
	const state = store.getState();
	const updated = getDistributedNotifications(update([...state.notifications, ...state.queue]), state.defaultPosition, state.limit);
	store.setState({
		notifications: updated.notifications,
		queue: updated.queue,
		limit: state.limit,
		defaultPosition: state.defaultPosition
	});
}
function showNotification(notification, store = notificationsStore) {
	const id = notification.id || randomId();
	updateNotificationsState(store, (notifications) => {
		if (notification.id && notifications.some((n) => n.id === notification.id)) return notifications;
		return [...notifications, {
			...notification,
			id
		}];
	});
	return id;
}
function hideNotification(id, store = notificationsStore) {
	updateNotificationsState(store, (notifications) => notifications.filter((notification) => {
		if (notification.id === id) {
			notification.onClose?.(notification);
			return false;
		}
		return true;
	}));
	return id;
}
function updateNotification(notification, store = notificationsStore) {
	updateNotificationsState(store, (notifications) => notifications.map((item) => {
		if (item.id === notification.id) return {
			...item,
			...notification
		};
		return item;
	}));
	return notification.id;
}
function cleanNotifications(store = notificationsStore) {
	updateNotificationsState(store, () => []);
}
function cleanNotificationsQueue(store = notificationsStore) {
	updateNotificationsState(store, (notifications) => notifications.slice(0, store.getState().limit));
}
var notifications = {
	show: showNotification,
	hide: hideNotification,
	update: updateNotification,
	clean: cleanNotifications,
	cleanQueue: cleanNotificationsQueue,
	updateState: updateNotificationsState
};
//#endregion
//#region node_modules/@mantine/notifications/esm/get-grouped-notifications/get-grouped-notifications.mjs
var positions = [
	"bottom-center",
	"bottom-left",
	"bottom-right",
	"top-center",
	"top-left",
	"top-right"
];
function getGroupedNotifications(notifications, defaultPosition) {
	return notifications.reduce((acc, notification) => {
		acc[notification.position || defaultPosition].push(notification);
		return acc;
	}, positions.reduce((acc, item) => {
		acc[item] = [];
		return acc;
	}, {}));
}
//#endregion
//#region node_modules/@mantine/notifications/esm/get-notification-state-styles.mjs
var transforms = {
	left: "translateX(-100%)",
	right: "translateX(100%)",
	"top-center": "translateY(-100%)",
	"bottom-center": "translateY(100%)"
};
var noTransform = {
	left: "translateX(0)",
	right: "translateX(0)",
	"top-center": "translateY(0)",
	"bottom-center": "translateY(0)"
};
function getNotificationStateStyles({ state, maxHeight, position, transitionDuration }) {
	const [vertical, horizontal] = position.split("-");
	const property = horizontal === "center" ? `${vertical}-center` : horizontal;
	const commonStyles = {
		opacity: 0,
		maxHeight,
		transform: transforms[property],
		transitionDuration: `${transitionDuration}ms, ${transitionDuration}ms, ${transitionDuration}ms`,
		transitionTimingFunction: "cubic-bezier(.51,.3,0,1.21), cubic-bezier(.51,.3,0,1.21), linear",
		transitionProperty: "opacity, transform, max-height"
	};
	const inState = {
		opacity: 1,
		transform: noTransform[property]
	};
	const outState = {
		opacity: 0,
		maxHeight: 0,
		transform: transforms[property]
	};
	const transitionStyles = {
		entering: inState,
		entered: inState,
		exiting: outState,
		exited: outState
	};
	return {
		...commonStyles,
		...transitionStyles[state]
	};
}
//#endregion
//#region node_modules/@mantine/notifications/esm/get-auto-close/get-auto-close.mjs
function getAutoClose(autoClose, notificationAutoClose) {
	if (typeof notificationAutoClose === "number") return notificationAutoClose;
	if (notificationAutoClose === false || autoClose === false) return false;
	return autoClose;
}
//#endregion
//#region node_modules/@mantine/notifications/esm/NotificationContainer.mjs
var import_jsx_runtime = require_jsx_runtime();
var SCROLL_DISMISS_RESET_TIMEOUT = 120;
function NotificationContainer({ data, onHide, autoClose, transitionDuration, allowDragDismiss, allowScrollDismiss, paused, onHoverStart, onHoverEnd, ref, style, ...others }) {
	const [offset, setOffset] = (0, import_react.useState)(0);
	const [dismissed, setDismissed] = (0, import_react.useState)(false);
	const [dismissDirection, setDismissDirection] = (0, import_react.useState)(1);
	const [scrollDismissActive, setScrollDismissActive] = (0, import_react.useState)(false);
	const theme = useMantineTheme();
	const { autoClose: _autoClose, message, allowClose, position: _position, style: dataStyle, withCloseButton, onOpen: _onOpen, ...notificationProps } = data;
	const autoCloseDuration = getAutoClose(autoClose, data.autoClose);
	const autoCloseTimeout = (0, import_react.useRef)(-1);
	const hideTimeout = (0, import_react.useRef)(-1);
	const scrollDismissTimeout = (0, import_react.useRef)(-1);
	const notificationRef = (0, import_react.useRef)(null);
	const hoveredRef = (0, import_react.useRef)(false);
	const offsetRef = (0, import_react.useRef)(0);
	const isCloseDisabled = allowClose === false;
	const cancelAutoClose = () => window.clearTimeout(autoCloseTimeout.current);
	const cancelHide = () => window.clearTimeout(hideTimeout.current);
	const cancelScrollDismissReset = () => window.clearTimeout(scrollDismissTimeout.current);
	const setSwipeOffset = (value) => {
		offsetRef.current = value;
		setOffset(value);
	};
	const handleHide = () => {
		onHide(data.id);
		cancelAutoClose();
		cancelHide();
		cancelScrollDismissReset();
	};
	const handleAutoClose = () => {
		if (dismissed || active || paused || hoveredRef.current || typeof autoCloseDuration !== "number") return;
		autoCloseTimeout.current = window.setTimeout(handleHide, autoCloseDuration);
	};
	const getExitOffset = (direction) => {
		return direction * ((notificationRef.current?.offsetWidth ?? 440) + 40);
	};
	const shouldDismiss = (movement, velocity) => {
		const width = notificationRef.current?.offsetWidth ?? 440;
		return Math.abs(movement) > width * .35 || velocity > .5;
	};
	const resetSwipe = () => {
		cancelScrollDismissReset();
		setScrollDismissActive(false);
		setSwipeOffset(0);
	};
	const dismissNotification = (direction) => {
		setDismissDirection(direction);
		setDismissed(true);
		setScrollDismissActive(false);
		setSwipeOffset(getExitOffset(direction));
		cancelAutoClose();
		cancelHide();
		cancelScrollDismissReset();
		hideTimeout.current = window.setTimeout(handleHide, transitionDuration);
	};
	const scheduleScrollDismissReset = () => {
		cancelScrollDismissReset();
		scrollDismissTimeout.current = window.setTimeout(() => {
			setScrollDismissActive(false);
			setSwipeOffset(0);
			handleAutoClose();
		}, SCROLL_DISMISS_RESET_TIMEOUT);
	};
	const { ref: dragRef, active } = useDrag((state) => {
		if (dismissed) return;
		if (state.first) cancelAutoClose();
		if (state.last) {
			if (state.tap || state.canceled) {
				setSwipeOffset(0);
				handleAutoClose();
				return;
			}
			const movement = state.movement[0];
			const direction = movement === 0 ? state.direction[0] === -1 ? -1 : 1 : movement > 0 ? 1 : -1;
			if (shouldDismiss(movement, state.velocity[0])) dismissNotification(direction);
			else {
				setSwipeOffset(0);
				handleAutoClose();
			}
		} else setSwipeOffset(state.movement[0]);
	}, {
		axis: "x",
		threshold: 5,
		filterTaps: true,
		enabled: allowDragDismiss && !isCloseDisabled && !dismissed
	});
	const mergedRef = useMergedRef(ref, notificationRef, dragRef);
	const resolvedStyle = getStyleObject(style, theme);
	const resolvedDataStyle = getStyleObject(dataStyle, theme);
	const baseStyle = {
		...resolvedStyle,
		...resolvedDataStyle
	};
	const baseOpacity = typeof baseStyle.opacity === "number" ? baseStyle.opacity : 1;
	const swipeOpacity = dismissed ? 0 : 1 - Math.min(Math.abs(offset) / 200, 1) * .6;
	const resolvedTransitionDuration = baseStyle.transitionDuration ?? `${transitionDuration}ms, ${transitionDuration}ms, ${transitionDuration}ms`;
	const notificationStyle = {
		...baseStyle,
		["--notifications-state-transform"]: typeof baseStyle.transform === "string" ? baseStyle.transform : "translateX(0)",
		["--notifications-state-opacity"]: String(baseOpacity),
		["--notifications-swipe-offset"]: `${offset}px`,
		["--notifications-swipe-opacity"]: String(swipeOpacity),
		transform: "var(--notifications-state-transform) translate3d(var(--notifications-swipe-offset), 0, 0)",
		opacity: "calc(var(--notifications-state-opacity) * var(--notifications-swipe-opacity))",
		transitionDuration: active || scrollDismissActive ? "0ms, 0ms, 0ms" : resolvedTransitionDuration,
		cursor: "default",
		touchAction: "pan-y"
	};
	const handleMouseEnter = () => {
		hoveredRef.current = true;
		cancelAutoClose();
		onHoverStart?.();
	};
	const handleMouseLeave = () => {
		hoveredRef.current = false;
		if (!scrollDismissActive) {
			resetSwipe();
			handleAutoClose();
		}
		onHoverEnd?.();
	};
	const handleWheel = (0, import_react.useEffectEvent)((event) => {
		if (dismissed || active) return;
		const isDocumentEvent = event.currentTarget === document;
		if (!isDocumentEvent && !hoveredRef.current) return;
		const { deltaX, deltaY } = event;
		if (Math.abs(deltaX) <= Math.abs(deltaY) || deltaX === 0) return;
		if (!allowScrollDismiss || isCloseDisabled) return;
		if (!isDocumentEvent) {
			event.preventDefault();
			event.stopPropagation();
		}
		cancelAutoClose();
		setScrollDismissActive(true);
		const nextOffset = offsetRef.current - deltaX;
		const direction = nextOffset > 0 ? 1 : -1;
		if (shouldDismiss(nextOffset, 0)) {
			dismissNotification(direction);
			return;
		}
		setSwipeOffset(nextOffset);
		scheduleScrollDismissReset();
	});
	(0, import_react.useEffect)(() => {
		if (!scrollDismissActive) return;
		document.addEventListener("wheel", handleWheel, { passive: false });
		return () => document.removeEventListener("wheel", handleWheel, { passive: false });
	}, [scrollDismissActive]);
	(0, import_react.useEffect)(() => {
		const handleResize = () => {
			if (dismissed) setSwipeOffset(getExitOffset(dismissDirection));
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [dismissDirection, dismissed]);
	(0, import_react.useEffect)(() => {
		const node = notificationRef.current;
		if (!node) return;
		node.addEventListener("wheel", handleWheel, { passive: false });
		return () => node.removeEventListener("wheel", handleWheel, { passive: false });
	}, []);
	(0, import_react.useEffect)(() => {
		return () => {
			cancelHide();
			cancelScrollDismissReset();
		};
	}, []);
	(0, import_react.useEffect)(() => {
		data.onOpen?.(data);
	}, []);
	(0, import_react.useEffect)(() => {
		handleAutoClose();
		return cancelAutoClose;
	}, [
		autoCloseDuration,
		active,
		dismissed
	]);
	(0, import_react.useEffect)(() => {
		if (paused) cancelAutoClose();
		else handleAutoClose();
		return cancelAutoClose;
	}, [paused]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Notification, {
		ref: mergedRef,
		...others,
		style: notificationStyle,
		...notificationProps,
		withCloseButton: isCloseDisabled ? false : withCloseButton,
		onClose: handleHide,
		onMouseEnter: handleMouseEnter,
		onMouseLeave: handleMouseLeave,
		children: message
	});
}
NotificationContainer.displayName = "@mantine/notifications/NotificationContainer";
//#endregion
//#region node_modules/@mantine/notifications/esm/Notifications.module.mjs
var Notifications_module_default = {
	"root": "m_b37d9ac7",
	"notification": "m_5ed0edd0"
};
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/extends.js
function _extends() {
	return _extends = Object.assign ? Object.assign.bind() : function(n) {
		for (var e = 1; e < arguments.length; e++) {
			var t = arguments[e];
			for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
		}
		return n;
	}, _extends.apply(null, arguments);
}
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js
function _objectWithoutPropertiesLoose(r, e) {
	if (null == r) return {};
	var t = {};
	for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
		if (-1 !== e.indexOf(n)) continue;
		t[n] = r[n];
	}
	return t;
}
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/setPrototypeOf.js
function _setPrototypeOf(t, e) {
	return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
		return t.__proto__ = e, t;
	}, _setPrototypeOf(t, e);
}
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/inheritsLoose.js
function _inheritsLoose(t, o) {
	t.prototype = Object.create(o.prototype), t.prototype.constructor = t, _setPrototypeOf(t, o);
}
//#endregion
//#region node_modules/react-transition-group/esm/config.js
var config_default = { disabled: false };
//#endregion
//#region node_modules/react-transition-group/esm/utils/PropTypes.js
var import_prop_types = /* @__PURE__ */ __toESM(require_prop_types());
var timeoutsShape = import_prop_types.default.oneOfType([import_prop_types.default.number, import_prop_types.default.shape({
	enter: import_prop_types.default.number,
	exit: import_prop_types.default.number,
	appear: import_prop_types.default.number
}).isRequired]);
import_prop_types.default.oneOfType([
	import_prop_types.default.string,
	import_prop_types.default.shape({
		enter: import_prop_types.default.string,
		exit: import_prop_types.default.string,
		active: import_prop_types.default.string
	}),
	import_prop_types.default.shape({
		enter: import_prop_types.default.string,
		enterDone: import_prop_types.default.string,
		enterActive: import_prop_types.default.string,
		exit: import_prop_types.default.string,
		exitDone: import_prop_types.default.string,
		exitActive: import_prop_types.default.string
	})
]);
//#endregion
//#region node_modules/react-transition-group/esm/TransitionGroupContext.js
var TransitionGroupContext_default = import_react.createContext(null);
//#endregion
//#region node_modules/react-transition-group/esm/utils/reflow.js
var forceReflow = function forceReflow(node) {
	return node.scrollTop;
};
//#endregion
//#region node_modules/react-transition-group/esm/Transition.js
var import_react_dom = /* @__PURE__ */ __toESM(require_react_dom());
var UNMOUNTED = "unmounted";
var EXITED = "exited";
var ENTERING = "entering";
var ENTERED = "entered";
var EXITING = "exiting";
/**
* The Transition component lets you describe a transition from one component
* state to another _over time_ with a simple declarative API. Most commonly
* it's used to animate the mounting and unmounting of a component, but can also
* be used to describe in-place transition states as well.
*
* ---
*
* **Note**: `Transition` is a platform-agnostic base component. If you're using
* transitions in CSS, you'll probably want to use
* [`CSSTransition`](https://reactcommunity.org/react-transition-group/css-transition)
* instead. It inherits all the features of `Transition`, but contains
* additional features necessary to play nice with CSS transitions (hence the
* name of the component).
*
* ---
*
* By default the `Transition` component does not alter the behavior of the
* component it renders, it only tracks "enter" and "exit" states for the
* components. It's up to you to give meaning and effect to those states. For
* example we can add styles to a component when it enters or exits:
*
* ```jsx
* import { Transition } from 'react-transition-group';
*
* const duration = 300;
*
* const defaultStyle = {
*   transition: `opacity ${duration}ms ease-in-out`,
*   opacity: 0,
* }
*
* const transitionStyles = {
*   entering: { opacity: 1 },
*   entered:  { opacity: 1 },
*   exiting:  { opacity: 0 },
*   exited:  { opacity: 0 },
* };
*
* const Fade = ({ in: inProp }) => (
*   <Transition in={inProp} timeout={duration}>
*     {state => (
*       <div style={{
*         ...defaultStyle,
*         ...transitionStyles[state]
*       }}>
*         I'm a fade Transition!
*       </div>
*     )}
*   </Transition>
* );
* ```
*
* There are 4 main states a Transition can be in:
*  - `'entering'`
*  - `'entered'`
*  - `'exiting'`
*  - `'exited'`
*
* Transition state is toggled via the `in` prop. When `true` the component
* begins the "Enter" stage. During this stage, the component will shift from
* its current transition state, to `'entering'` for the duration of the
* transition and then to the `'entered'` stage once it's complete. Let's take
* the following example (we'll use the
* [useState](https://reactjs.org/docs/hooks-reference.html#usestate) hook):
*
* ```jsx
* function App() {
*   const [inProp, setInProp] = useState(false);
*   return (
*     <div>
*       <Transition in={inProp} timeout={500}>
*         {state => (
*           // ...
*         )}
*       </Transition>
*       <button onClick={() => setInProp(true)}>
*         Click to Enter
*       </button>
*     </div>
*   );
* }
* ```
*
* When the button is clicked the component will shift to the `'entering'` state
* and stay there for 500ms (the value of `timeout`) before it finally switches
* to `'entered'`.
*
* When `in` is `false` the same thing happens except the state moves from
* `'exiting'` to `'exited'`.
*/
var Transition = /* @__PURE__ */ function(_React$Component) {
	_inheritsLoose(Transition, _React$Component);
	function Transition(props, context) {
		var _this = _React$Component.call(this, props, context) || this;
		var parentGroup = context;
		var appear = parentGroup && !parentGroup.isMounting ? props.enter : props.appear;
		var initialStatus;
		_this.appearStatus = null;
		if (props.in) if (appear) {
			initialStatus = EXITED;
			_this.appearStatus = ENTERING;
		} else initialStatus = ENTERED;
		else if (props.unmountOnExit || props.mountOnEnter) initialStatus = UNMOUNTED;
		else initialStatus = EXITED;
		_this.state = { status: initialStatus };
		_this.nextCallback = null;
		return _this;
	}
	Transition.getDerivedStateFromProps = function getDerivedStateFromProps(_ref, prevState) {
		if (_ref.in && prevState.status === "unmounted") return { status: EXITED };
		return null;
	};
	var _proto = Transition.prototype;
	_proto.componentDidMount = function componentDidMount() {
		this.updateStatus(true, this.appearStatus);
	};
	_proto.componentDidUpdate = function componentDidUpdate(prevProps) {
		var nextStatus = null;
		if (prevProps !== this.props) {
			var status = this.state.status;
			if (this.props.in) {
				if (status !== "entering" && status !== "entered") nextStatus = ENTERING;
			} else if (status === "entering" || status === "entered") nextStatus = EXITING;
		}
		this.updateStatus(false, nextStatus);
	};
	_proto.componentWillUnmount = function componentWillUnmount() {
		this.cancelNextCallback();
	};
	_proto.getTimeouts = function getTimeouts() {
		var timeout = this.props.timeout;
		var exit = enter = appear = timeout, enter, appear;
		if (timeout != null && typeof timeout !== "number") {
			exit = timeout.exit;
			enter = timeout.enter;
			appear = timeout.appear !== void 0 ? timeout.appear : enter;
		}
		return {
			exit,
			enter,
			appear
		};
	};
	_proto.updateStatus = function updateStatus(mounting, nextStatus) {
		if (mounting === void 0) mounting = false;
		if (nextStatus !== null) {
			this.cancelNextCallback();
			if (nextStatus === "entering") {
				if (this.props.unmountOnExit || this.props.mountOnEnter) {
					var node = this.props.nodeRef ? this.props.nodeRef.current : import_react_dom.default.findDOMNode(this);
					if (node) forceReflow(node);
				}
				this.performEnter(mounting);
			} else this.performExit();
		} else if (this.props.unmountOnExit && this.state.status === "exited") this.setState({ status: UNMOUNTED });
	};
	_proto.performEnter = function performEnter(mounting) {
		var _this2 = this;
		var enter = this.props.enter;
		var appearing = this.context ? this.context.isMounting : mounting;
		var _ref2 = this.props.nodeRef ? [appearing] : [import_react_dom.default.findDOMNode(this), appearing], maybeNode = _ref2[0], maybeAppearing = _ref2[1];
		var timeouts = this.getTimeouts();
		var enterTimeout = appearing ? timeouts.appear : timeouts.enter;
		if (!mounting && !enter || config_default.disabled) {
			this.safeSetState({ status: ENTERED }, function() {
				_this2.props.onEntered(maybeNode);
			});
			return;
		}
		this.props.onEnter(maybeNode, maybeAppearing);
		this.safeSetState({ status: ENTERING }, function() {
			_this2.props.onEntering(maybeNode, maybeAppearing);
			_this2.onTransitionEnd(enterTimeout, function() {
				_this2.safeSetState({ status: ENTERED }, function() {
					_this2.props.onEntered(maybeNode, maybeAppearing);
				});
			});
		});
	};
	_proto.performExit = function performExit() {
		var _this3 = this;
		var exit = this.props.exit;
		var timeouts = this.getTimeouts();
		var maybeNode = this.props.nodeRef ? void 0 : import_react_dom.default.findDOMNode(this);
		if (!exit || config_default.disabled) {
			this.safeSetState({ status: EXITED }, function() {
				_this3.props.onExited(maybeNode);
			});
			return;
		}
		this.props.onExit(maybeNode);
		this.safeSetState({ status: EXITING }, function() {
			_this3.props.onExiting(maybeNode);
			_this3.onTransitionEnd(timeouts.exit, function() {
				_this3.safeSetState({ status: EXITED }, function() {
					_this3.props.onExited(maybeNode);
				});
			});
		});
	};
	_proto.cancelNextCallback = function cancelNextCallback() {
		if (this.nextCallback !== null) {
			this.nextCallback.cancel();
			this.nextCallback = null;
		}
	};
	_proto.safeSetState = function safeSetState(nextState, callback) {
		callback = this.setNextCallback(callback);
		this.setState(nextState, callback);
	};
	_proto.setNextCallback = function setNextCallback(callback) {
		var _this4 = this;
		var active = true;
		this.nextCallback = function(event) {
			if (active) {
				active = false;
				_this4.nextCallback = null;
				callback(event);
			}
		};
		this.nextCallback.cancel = function() {
			active = false;
		};
		return this.nextCallback;
	};
	_proto.onTransitionEnd = function onTransitionEnd(timeout, handler) {
		this.setNextCallback(handler);
		var node = this.props.nodeRef ? this.props.nodeRef.current : import_react_dom.default.findDOMNode(this);
		var doesNotHaveTimeoutOrListener = timeout == null && !this.props.addEndListener;
		if (!node || doesNotHaveTimeoutOrListener) {
			setTimeout(this.nextCallback, 0);
			return;
		}
		if (this.props.addEndListener) {
			var _ref3 = this.props.nodeRef ? [this.nextCallback] : [node, this.nextCallback], maybeNode = _ref3[0], maybeNextCallback = _ref3[1];
			this.props.addEndListener(maybeNode, maybeNextCallback);
		}
		if (timeout != null) setTimeout(this.nextCallback, timeout);
	};
	_proto.render = function render() {
		var status = this.state.status;
		if (status === "unmounted") return null;
		var _this$props = this.props, children = _this$props.children;
		_this$props.in;
		_this$props.mountOnEnter;
		_this$props.unmountOnExit;
		_this$props.appear;
		_this$props.enter;
		_this$props.exit;
		_this$props.timeout;
		_this$props.addEndListener;
		_this$props.onEnter;
		_this$props.onEntering;
		_this$props.onEntered;
		_this$props.onExit;
		_this$props.onExiting;
		_this$props.onExited;
		_this$props.nodeRef;
		var childProps = _objectWithoutPropertiesLoose(_this$props, [
			"children",
			"in",
			"mountOnEnter",
			"unmountOnExit",
			"appear",
			"enter",
			"exit",
			"timeout",
			"addEndListener",
			"onEnter",
			"onEntering",
			"onEntered",
			"onExit",
			"onExiting",
			"onExited",
			"nodeRef"
		]);
		return /* @__PURE__ */ import_react.createElement(TransitionGroupContext_default.Provider, { value: null }, typeof children === "function" ? children(status, childProps) : import_react.cloneElement(import_react.Children.only(children), childProps));
	};
	return Transition;
}(import_react.Component);
Transition.contextType = TransitionGroupContext_default;
Transition.propTypes = {
	/**
	* A React reference to DOM element that need to transition:
	* https://stackoverflow.com/a/51127130/4671932
	*
	*   - When `nodeRef` prop is used, `node` is not passed to callback functions
	*      (e.g. `onEnter`) because user already has direct access to the node.
	*   - When changing `key` prop of `Transition` in a `TransitionGroup` a new
	*     `nodeRef` need to be provided to `Transition` with changed `key` prop
	*     (see
	*     [test/CSSTransition-test.js](https://github.com/reactjs/react-transition-group/blob/13435f897b3ab71f6e19d724f145596f5910581c/test/CSSTransition-test.js#L362-L437)).
	*/
	nodeRef: import_prop_types.default.shape({ current: typeof Element === "undefined" ? import_prop_types.default.any : function(propValue, key, componentName, location, propFullName, secret) {
		var value = propValue[key];
		return import_prop_types.default.instanceOf(value && "ownerDocument" in value ? value.ownerDocument.defaultView.Element : Element)(propValue, key, componentName, location, propFullName, secret);
	} }),
	/**
	* A `function` child can be used instead of a React element. This function is
	* called with the current transition status (`'entering'`, `'entered'`,
	* `'exiting'`, `'exited'`), which can be used to apply context
	* specific props to a component.
	*
	* ```jsx
	* <Transition in={this.state.in} timeout={150}>
	*   {state => (
	*     <MyComponent className={`fade fade-${state}`} />
	*   )}
	* </Transition>
	* ```
	*/
	children: import_prop_types.default.oneOfType([import_prop_types.default.func.isRequired, import_prop_types.default.element.isRequired]).isRequired,
	/**
	* Show the component; triggers the enter or exit states
	*/
	in: import_prop_types.default.bool,
	/**
	* By default the child component is mounted immediately along with
	* the parent `Transition` component. If you want to "lazy mount" the component on the
	* first `in={true}` you can set `mountOnEnter`. After the first enter transition the component will stay
	* mounted, even on "exited", unless you also specify `unmountOnExit`.
	*/
	mountOnEnter: import_prop_types.default.bool,
	/**
	* By default the child component stays mounted after it reaches the `'exited'` state.
	* Set `unmountOnExit` if you'd prefer to unmount the component after it finishes exiting.
	*/
	unmountOnExit: import_prop_types.default.bool,
	/**
	* By default the child component does not perform the enter transition when
	* it first mounts, regardless of the value of `in`. If you want this
	* behavior, set both `appear` and `in` to `true`.
	*
	* > **Note**: there are no special appear states like `appearing`/`appeared`, this prop
	* > only adds an additional enter transition. However, in the
	* > `<CSSTransition>` component that first enter transition does result in
	* > additional `.appear-*` classes, that way you can choose to style it
	* > differently.
	*/
	appear: import_prop_types.default.bool,
	/**
	* Enable or disable enter transitions.
	*/
	enter: import_prop_types.default.bool,
	/**
	* Enable or disable exit transitions.
	*/
	exit: import_prop_types.default.bool,
	/**
	* The duration of the transition, in milliseconds.
	* Required unless `addEndListener` is provided.
	*
	* You may specify a single timeout for all transitions:
	*
	* ```jsx
	* timeout={500}
	* ```
	*
	* or individually:
	*
	* ```jsx
	* timeout={{
	*  appear: 500,
	*  enter: 300,
	*  exit: 500,
	* }}
	* ```
	*
	* - `appear` defaults to the value of `enter`
	* - `enter` defaults to `0`
	* - `exit` defaults to `0`
	*
	* @type {number | { enter?: number, exit?: number, appear?: number }}
	*/
	timeout: function timeout(props) {
		var pt = timeoutsShape;
		if (!props.addEndListener) pt = pt.isRequired;
		for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) args[_key - 1] = arguments[_key];
		return pt.apply(void 0, [props].concat(args));
	},
	/**
	* Add a custom transition end trigger. Called with the transitioning
	* DOM node and a `done` callback. Allows for more fine grained transition end
	* logic. Timeouts are still used as a fallback if provided.
	*
	* **Note**: when `nodeRef` prop is passed, `node` is not passed.
	*
	* ```jsx
	* addEndListener={(node, done) => {
	*   // use the css transitionend event to mark the finish of a transition
	*   node.addEventListener('transitionend', done, false);
	* }}
	* ```
	*/
	addEndListener: import_prop_types.default.func,
	/**
	* Callback fired before the "entering" status is applied. An extra parameter
	* `isAppearing` is supplied to indicate if the enter stage is occurring on the initial mount
	*
	* **Note**: when `nodeRef` prop is passed, `node` is not passed.
	*
	* @type Function(node: HtmlElement, isAppearing: bool) -> void
	*/
	onEnter: import_prop_types.default.func,
	/**
	* Callback fired after the "entering" status is applied. An extra parameter
	* `isAppearing` is supplied to indicate if the enter stage is occurring on the initial mount
	*
	* **Note**: when `nodeRef` prop is passed, `node` is not passed.
	*
	* @type Function(node: HtmlElement, isAppearing: bool)
	*/
	onEntering: import_prop_types.default.func,
	/**
	* Callback fired after the "entered" status is applied. An extra parameter
	* `isAppearing` is supplied to indicate if the enter stage is occurring on the initial mount
	*
	* **Note**: when `nodeRef` prop is passed, `node` is not passed.
	*
	* @type Function(node: HtmlElement, isAppearing: bool) -> void
	*/
	onEntered: import_prop_types.default.func,
	/**
	* Callback fired before the "exiting" status is applied.
	*
	* **Note**: when `nodeRef` prop is passed, `node` is not passed.
	*
	* @type Function(node: HtmlElement) -> void
	*/
	onExit: import_prop_types.default.func,
	/**
	* Callback fired after the "exiting" status is applied.
	*
	* **Note**: when `nodeRef` prop is passed, `node` is not passed.
	*
	* @type Function(node: HtmlElement) -> void
	*/
	onExiting: import_prop_types.default.func,
	/**
	* Callback fired after the "exited" status is applied.
	*
	* **Note**: when `nodeRef` prop is passed, `node` is not passed
	*
	* @type Function(node: HtmlElement) -> void
	*/
	onExited: import_prop_types.default.func
};
function noop() {}
Transition.defaultProps = {
	in: false,
	mountOnEnter: false,
	unmountOnExit: false,
	appear: false,
	enter: true,
	exit: true,
	onEnter: noop,
	onEntering: noop,
	onEntered: noop,
	onExit: noop,
	onExiting: noop,
	onExited: noop
};
Transition.UNMOUNTED = UNMOUNTED;
Transition.EXITED = EXITED;
Transition.ENTERING = ENTERING;
Transition.ENTERED = ENTERED;
Transition.EXITING = EXITING;
//#endregion
//#region node_modules/@babel/runtime/helpers/esm/assertThisInitialized.js
function _assertThisInitialized(e) {
	if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	return e;
}
//#endregion
//#region node_modules/react-transition-group/esm/utils/ChildMapping.js
/**
* Given `this.props.children`, return an object mapping key to child.
*
* @param {*} children `this.props.children`
* @return {object} Mapping of key to child
*/
function getChildMapping(children, mapFn) {
	var mapper = function mapper(child) {
		return mapFn && (0, import_react.isValidElement)(child) ? mapFn(child) : child;
	};
	var result = Object.create(null);
	if (children) import_react.Children.map(children, function(c) {
		return c;
	}).forEach(function(child) {
		result[child.key] = mapper(child);
	});
	return result;
}
/**
* When you're adding or removing children some may be added or removed in the
* same render pass. We want to show *both* since we want to simultaneously
* animate elements in and out. This function takes a previous set of keys
* and a new set of keys and merges them with its best guess of the correct
* ordering. In the future we may expose some of the utilities in
* ReactMultiChild to make this easy, but for now React itself does not
* directly have this concept of the union of prevChildren and nextChildren
* so we implement it here.
*
* @param {object} prev prev children as returned from
* `ReactTransitionChildMapping.getChildMapping()`.
* @param {object} next next children as returned from
* `ReactTransitionChildMapping.getChildMapping()`.
* @return {object} a key set that contains all keys in `prev` and all keys
* in `next` in a reasonable order.
*/
function mergeChildMappings(prev, next) {
	prev = prev || {};
	next = next || {};
	function getValueForKey(key) {
		return key in next ? next[key] : prev[key];
	}
	var nextKeysPending = Object.create(null);
	var pendingKeys = [];
	for (var prevKey in prev) if (prevKey in next) {
		if (pendingKeys.length) {
			nextKeysPending[prevKey] = pendingKeys;
			pendingKeys = [];
		}
	} else pendingKeys.push(prevKey);
	var i;
	var childMapping = {};
	for (var nextKey in next) {
		if (nextKeysPending[nextKey]) for (i = 0; i < nextKeysPending[nextKey].length; i++) {
			var pendingNextKey = nextKeysPending[nextKey][i];
			childMapping[nextKeysPending[nextKey][i]] = getValueForKey(pendingNextKey);
		}
		childMapping[nextKey] = getValueForKey(nextKey);
	}
	for (i = 0; i < pendingKeys.length; i++) childMapping[pendingKeys[i]] = getValueForKey(pendingKeys[i]);
	return childMapping;
}
function getProp(child, prop, props) {
	return props[prop] != null ? props[prop] : child.props[prop];
}
function getInitialChildMapping(props, onExited) {
	return getChildMapping(props.children, function(child) {
		return (0, import_react.cloneElement)(child, {
			onExited: onExited.bind(null, child),
			in: true,
			appear: getProp(child, "appear", props),
			enter: getProp(child, "enter", props),
			exit: getProp(child, "exit", props)
		});
	});
}
function getNextChildMapping(nextProps, prevChildMapping, onExited) {
	var nextChildMapping = getChildMapping(nextProps.children);
	var children = mergeChildMappings(prevChildMapping, nextChildMapping);
	Object.keys(children).forEach(function(key) {
		var child = children[key];
		if (!(0, import_react.isValidElement)(child)) return;
		var hasPrev = key in prevChildMapping;
		var hasNext = key in nextChildMapping;
		var prevChild = prevChildMapping[key];
		var isLeaving = (0, import_react.isValidElement)(prevChild) && !prevChild.props.in;
		if (hasNext && (!hasPrev || isLeaving)) children[key] = (0, import_react.cloneElement)(child, {
			onExited: onExited.bind(null, child),
			in: true,
			exit: getProp(child, "exit", nextProps),
			enter: getProp(child, "enter", nextProps)
		});
		else if (!hasNext && hasPrev && !isLeaving) children[key] = (0, import_react.cloneElement)(child, { in: false });
		else if (hasNext && hasPrev && (0, import_react.isValidElement)(prevChild)) children[key] = (0, import_react.cloneElement)(child, {
			onExited: onExited.bind(null, child),
			in: prevChild.props.in,
			exit: getProp(child, "exit", nextProps),
			enter: getProp(child, "enter", nextProps)
		});
	});
	return children;
}
//#endregion
//#region node_modules/react-transition-group/esm/TransitionGroup.js
var values = Object.values || function(obj) {
	return Object.keys(obj).map(function(k) {
		return obj[k];
	});
};
var defaultProps$1 = {
	component: "div",
	childFactory: function childFactory(child) {
		return child;
	}
};
/**
* The `<TransitionGroup>` component manages a set of transition components
* (`<Transition>` and `<CSSTransition>`) in a list. Like with the transition
* components, `<TransitionGroup>` is a state machine for managing the mounting
* and unmounting of components over time.
*
* Consider the example below. As items are removed or added to the TodoList the
* `in` prop is toggled automatically by the `<TransitionGroup>`.
*
* Note that `<TransitionGroup>`  does not define any animation behavior!
* Exactly _how_ a list item animates is up to the individual transition
* component. This means you can mix and match animations across different list
* items.
*/
var TransitionGroup = /* @__PURE__ */ function(_React$Component) {
	_inheritsLoose(TransitionGroup, _React$Component);
	function TransitionGroup(props, context) {
		var _this = _React$Component.call(this, props, context) || this;
		_this.state = {
			contextValue: { isMounting: true },
			handleExited: _this.handleExited.bind(_assertThisInitialized(_this)),
			firstRender: true
		};
		return _this;
	}
	var _proto = TransitionGroup.prototype;
	_proto.componentDidMount = function componentDidMount() {
		this.mounted = true;
		this.setState({ contextValue: { isMounting: false } });
	};
	_proto.componentWillUnmount = function componentWillUnmount() {
		this.mounted = false;
	};
	TransitionGroup.getDerivedStateFromProps = function getDerivedStateFromProps(nextProps, _ref) {
		var prevChildMapping = _ref.children, handleExited = _ref.handleExited;
		return {
			children: _ref.firstRender ? getInitialChildMapping(nextProps, handleExited) : getNextChildMapping(nextProps, prevChildMapping, handleExited),
			firstRender: false
		};
	};
	_proto.handleExited = function handleExited(child, node) {
		var currentChildMapping = getChildMapping(this.props.children);
		if (child.key in currentChildMapping) return;
		if (child.props.onExited) child.props.onExited(node);
		if (this.mounted) this.setState(function(state) {
			var children = _extends({}, state.children);
			delete children[child.key];
			return { children };
		});
	};
	_proto.render = function render() {
		var _this$props = this.props, Component = _this$props.component, childFactory = _this$props.childFactory, props = _objectWithoutPropertiesLoose(_this$props, ["component", "childFactory"]);
		var contextValue = this.state.contextValue;
		var children = values(this.state.children).map(childFactory);
		delete props.appear;
		delete props.enter;
		delete props.exit;
		if (Component === null) return /* @__PURE__ */ import_react.createElement(TransitionGroupContext_default.Provider, { value: contextValue }, children);
		return /* @__PURE__ */ import_react.createElement(TransitionGroupContext_default.Provider, { value: contextValue }, /* @__PURE__ */ import_react.createElement(Component, props, children));
	};
	return TransitionGroup;
}(import_react.Component);
TransitionGroup.propTypes = {
	/**
	* `<TransitionGroup>` renders a `<div>` by default. You can change this
	* behavior by providing a `component` prop.
	* If you use React v16+ and would like to avoid a wrapping `<div>` element
	* you can pass in `component={null}`. This is useful if the wrapping div
	* borks your css styles.
	*/
	component: import_prop_types.default.any,
	/**
	* A set of `<Transition>` components, that are toggled `in` and out as they
	* leave. the `<TransitionGroup>` will inject specific transition props, so
	* remember to spread them through if you are wrapping the `<Transition>` as
	* with our `<Fade>` example.
	*
	* While this component is meant for multiple `Transition` or `CSSTransition`
	* children, sometimes you may want to have a single transition child with
	* content that you want to be transitioned out and in when you change it
	* (e.g. routes, images etc.) In that case you can change the `key` prop of
	* the transition child as you change its content, this will cause
	* `TransitionGroup` to transition the child out and back in.
	*/
	children: import_prop_types.default.node,
	/**
	* A convenience prop that enables or disables appear animations
	* for all children. Note that specifying this will override any defaults set
	* on individual children Transitions.
	*/
	appear: import_prop_types.default.bool,
	/**
	* A convenience prop that enables or disables enter animations
	* for all children. Note that specifying this will override any defaults set
	* on individual children Transitions.
	*/
	enter: import_prop_types.default.bool,
	/**
	* A convenience prop that enables or disables exit animations
	* for all children. Note that specifying this will override any defaults set
	* on individual children Transitions.
	*/
	exit: import_prop_types.default.bool,
	/**
	* You may need to apply reactive updates to a child as it is exiting.
	* This is generally done by using `cloneElement` however in the case of an exiting
	* child the element has already been removed and not accessible to the consumer.
	*
	* If you do need to update a child as it leaves you can provide a `childFactory`
	* to wrap every child, even the ones that are leaving.
	*
	* @type Function(child: ReactElement) -> ReactElement
	*/
	childFactory: import_prop_types.default.func
};
TransitionGroup.defaultProps = defaultProps$1;
//#endregion
//#region node_modules/@mantine/notifications/esm/Notifications.mjs
var Transition$1 = Transition;
var defaultProps = {
	position: "bottom-right",
	autoClose: 4e3,
	transitionDuration: 250,
	allowDragDismiss: true,
	allowScrollDismiss: true,
	containerWidth: 440,
	notificationMaxHeight: 200,
	limit: 5,
	zIndex: getDefaultZIndex("overlay"),
	store: notificationsStore,
	withinPortal: true,
	pauseResetOnHover: "all"
};
var varsResolver = createVarsResolver((_, { zIndex, containerWidth }) => ({ root: {
	"--notifications-z-index": zIndex?.toString(),
	"--notifications-container-width": rem(containerWidth)
} }));
var Notifications = factory((_props) => {
	const props = useProps("Notifications", defaultProps, _props);
	const { classNames, className, style, styles, unstyled, vars, attributes, position, autoClose, transitionDuration, allowDragDismiss, allowScrollDismiss, containerWidth, notificationMaxHeight, limit, zIndex, store, portalProps, withinPortal, pauseResetOnHover, ...others } = props;
	const theme = useMantineTheme();
	const data = useNotifications(store);
	const forceUpdate = useForceUpdate();
	const shouldReduceMotion = useReducedMotion();
	const refs = (0, import_react.useRef)({});
	const previousLength = (0, import_react.useRef)(0);
	const [hoveredCount, setHoveredCount] = (0, import_react.useState)(0);
	const handleHoverStart = (0, import_react.useCallback)(() => setHoveredCount((c) => c + 1), []);
	const handleHoverEnd = (0, import_react.useCallback)(() => setHoveredCount((c) => Math.max(0, c - 1)), []);
	const duration = (theme.respectReducedMotion ? shouldReduceMotion : false) ? 1 : transitionDuration;
	const getStyles = useStyles({
		name: "Notifications",
		classes: Notifications_module_default,
		props,
		className,
		style,
		classNames,
		styles,
		unstyled,
		attributes,
		vars,
		varsResolver
	});
	(0, import_react.useEffect)(() => {
		store?.updateState((current) => ({
			...current,
			limit: limit || 5,
			defaultPosition: position
		}));
	}, [limit, position]);
	useDidUpdate(() => {
		if (data.notifications.length > previousLength.current) setTimeout(() => forceUpdate(), 0);
		previousLength.current = data.notifications.length;
	}, [data.notifications]);
	const grouped = getGroupedNotifications(data.notifications, position);
	const groupedComponents = positions.reduce((acc, pos) => {
		acc[pos] = grouped[pos].map(({ style: notificationStyle, ...notification }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Transition$1, {
			timeout: duration,
			onEnter: () => refs.current[notification.id].offsetHeight,
			nodeRef: { current: refs.current[notification.id] },
			children: (state) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotificationContainer, {
				ref: (node) => {
					if (node) refs.current[notification.id] = node;
				},
				data: notification,
				onHide: (id) => hideNotification(id, store),
				autoClose,
				transitionDuration: duration,
				allowDragDismiss,
				allowScrollDismiss,
				paused: pauseResetOnHover === "all" ? hoveredCount > 0 : false,
				onHoverStart: handleHoverStart,
				onHoverEnd: handleHoverEnd,
				...getStyles("notification", { style: {
					...getNotificationStateStyles({
						state,
						position: pos,
						transitionDuration: duration,
						maxHeight: notificationMaxHeight
					}),
					...notificationStyle
				} })
			})
		}, notification.id));
		return acc;
	}, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(OptionalPortal, {
		withinPortal,
		...portalProps,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				...getStyles("root"),
				"data-position": "top-center",
				...others,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TransitionGroup, { children: groupedComponents["top-center"] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				...getStyles("root"),
				"data-position": "top-left",
				...others,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TransitionGroup, { children: groupedComponents["top-left"] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				...getStyles("root", { className: ReactRemoveScroll.classNames.fullWidth }),
				"data-position": "top-right",
				...others,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TransitionGroup, { children: groupedComponents["top-right"] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				...getStyles("root", { className: ReactRemoveScroll.classNames.fullWidth }),
				"data-position": "bottom-right",
				...others,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TransitionGroup, { children: groupedComponents["bottom-right"] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				...getStyles("root"),
				"data-position": "bottom-left",
				...others,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TransitionGroup, { children: groupedComponents["bottom-left"] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				...getStyles("root"),
				"data-position": "bottom-center",
				...others,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TransitionGroup, { children: groupedComponents["bottom-center"] })
			})
		]
	});
});
Notifications.classes = Notifications_module_default;
Notifications.varsResolver = varsResolver;
Notifications.displayName = "@mantine/notifications/Notifications";
Notifications.show = notifications.show;
Notifications.hide = notifications.hide;
Notifications.update = notifications.update;
Notifications.clean = notifications.clean;
Notifications.cleanQueue = notifications.cleanQueue;
Notifications.updateState = notifications.updateState;
//#endregion
export { Notifications, cleanNotifications, cleanNotificationsQueue, createNotificationsStore, hideNotification, notifications, notificationsStore, showNotification, updateNotification, updateNotificationsState, useNotifications };

//# sourceMappingURL=@mantine_notifications.js.map