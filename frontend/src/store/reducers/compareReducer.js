import { TOGGLE_COMPARE, CLEAR_COMPARE } from '../constants/compareConstants';

export const MAX_COMPARE = 3;

// Holds full product objects so the comparison survives filter/page changes
export default function compareReducer(state = [], action) {
  switch (action.type) {
    case TOGGLE_COMPARE: {
      const p = action.payload;
      if (state.some((x) => x._id === p._id)) return state.filter((x) => x._id !== p._id);
      return state.length < MAX_COMPARE ? [...state, p] : state;
    }
    case CLEAR_COMPARE:
      return [];
    default:
      return state;
  }
}