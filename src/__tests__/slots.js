import Slots from "../slots";

describe('Slots', () => {
    let slots;
    it ('should set Rules and State', () => {

        let rules = {
            "route": (route) => {

            }
        };

        let state = {
            s: {
                b: [1,2,3]
            },
            x: [0]
        };

        slots = new Slots(rules, state);
        expect(slots.getRules()).toEqual(rules);
        expect(slots.getRules().route).toEqual(jasmine.any(Function));

        expect(slots.getState().toJS()).toEqual(state);
    });

    it ('should set and get', () => {
        let path = ["s", "b"];
        let newState = [4];
        slots.set(path, newState);
        expect(slots.get(path)).toEqual([4,2,3]);
        expect(slots.get(path.join('.'))).toEqual([4,2,3]);
        expect(slots.get()).toEqual({
            s: {
                b: [4,2,3]
            },
            x: [0]
        });
    });

    const flox2 = new Slots({}, {});
    flox2.set('route', {name: 'page', params: {id: 1}});
    const flox3 = new Slots({}, flox2.getState().toJS());
    it ('should restore state', () => {
        expect(flox3.getState().toJS()).toEqual(flox2.getState().toJS());
    });
});

