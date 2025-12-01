// Lists state (Svelte 5 runes)
// TODO: Implement lists state management using $state and $derived

export function createListsStore() {
  let lists = $state<any[]>([]);

  return {
    get lists() {
      return lists;
    },
    set lists(value) {
      lists = value;
    }
  };
}
