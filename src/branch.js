import { fromJS, is, Map, List} from "immutable";
import debug from "debug";
import { toJS, isFunction, isPromise, insp } from "./utils";
import Slots from "./slots";
const d = debug("slt");
const log = debug("slt:log");

class Branch {
    constructor(rules, state, ctx, parent = null) {
        this.rules = rules;
        this.state = state;
        this.ctx = ctx;
        this.parent = parent;
        this.path = [];
        this.value = null;
        this.children = [];
    }

    reset() {
        this.state = this.initialState;
    }

    newBranch(state) {
        let branch = new Branch(this.rules, state, this.ctx, this);
        this.children.push(branch);
        return branch;
    }

    setState(value) {
        return this.set([], value);
    }

    set(path = [], value = {}) {
        ({path, value} = this.reducePathAndValue(Slots.makePath(path), value));
        this.path = path;
        this.value = value;
        log("SET %s TO %s", insp(path), insp(value));
        let state = this.state;
        d("MERGED \n%s", insp(state));
        state = Branch.mergeValue(state, path, value); // TODO: deal with conflicts
        const applyRules = (path = new List(), value = {}) => {
            let rule = this.rules.get(path.toArray().join("."));
            if (isFunction(rule)) {
                log("RULE on path %s matched with value %s", insp(path), insp(value));
                let branch = this.newBranch(state);
                rule.call(branch, value);
                state = branch.state;
                if (!isPromise(branch)) {
                    d("NEW BRANCH with state %s", insp(state));
                    state = branch.state;
                    d("RESULT is %s", insp(state));
                } else {
                    log("PROMISE RETURNED");
                    branch.bind(this.ctx); // out of call stack
                    this.ctx.promises.push(branch);
                    branch.then(() => {
                        log("PROMISE FULFILLED for SET %s", insp(path));
                        this.ctx.promises.splice(this.ctx.promises.indexOf(branch), 1);
                        this.ctx.slots._checkPromises(this);
                    });
                }
            }
            else {
                if (value !== null && typeof value === 'object') {
                    Object.keys(value).forEach(k => applyRules(path.push(k), value[k]));
                }
            }
        };
        applyRules(new List(path), value);
        this.state = state;
        return this;
    }

    reducePathAndValue(path, value) {
        let i = path.length;
        let v = value;
        while (i--) {
            let p = path.slice(0, i);
            let tmp = {};
            tmp[path.slice(i)] = v;
            v = tmp;
            if (this.rules.get(p.join("."))) {
                path = p;
                value = v;
            }
        }
        return { path, value }
    }

    getState() {
        return this.state;
    }

    get(path = null, state = null) {
        state = state || this.state;
        if (!path) {
            return state.toJS();
        }
        path = Slots.makePath(path);
        let value = state.getIn(path);
        return toJS(value);
    }

    static mergeValue(state, path, value) {
        return (value !== null && typeof value === 'object') ?
            state.mergeDeepIn(path, value) : state.setIn(path, value);
    }
}

export default Branch;