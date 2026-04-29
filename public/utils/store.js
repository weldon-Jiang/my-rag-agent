class Store {
  constructor(initialState = {}) {
    this._state = initialState;
    this._listeners = new Set();
  }

  getState() {
    return this._state;
  }

  setState(newState, action = 'UPDATE') {
    const prevState = { ...this._state };
    this._state = { ...this._state, ...newState };
    console.log(`[Store] Action: ${action}`, { prev: prevState, next: this._state });
    this._notifyListeners(prevState);
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notifyListeners(prevState) {
    this._listeners.forEach(listener => {
      try {
        listener(this._state, prevState);
      } catch (e) {
        console.error('[Store] Listener error:', e);
      }
    });
  }
}

const appStore = new Store({
  sessions: [],
  currentSessionId: null,
  currentSession: null,
  messages: [],
  inputValue: '',
  isLoading: false,
  isProcessing: false,
  selectedModel: 'minimax-m2.5',
  selectedMode: 'hybrid',
  error: null,
  toasts: [],
  showSettings: false,
  models: [],
  skills: []
});

const actions = {
  setSessions: (sessions) => appStore.setState({ sessions }, 'SET_SESSIONS'),

  addSession: (session) => {
    const sessions = [session, ...appStore.getState().sessions];
    appStore.setState({ sessions, currentSessionId: session.id, currentSession: session }, 'ADD_SESSION');
  },

  deleteSession: (sessionId) => {
    const sessions = appStore.getState().sessions.filter(s => s.id !== sessionId);
    const currentSessionId = appStore.getState().currentSessionId === sessionId
      ? (sessions[0]?.id || null)
      : appStore.getState().currentSessionId;
    const currentSession = sessions.find(s => s.id === currentSessionId) || null;
    appStore.setState({ sessions, currentSessionId, currentSession }, 'DELETE_SESSION');
  },

  setCurrentSession: (sessionId) => {
    const sessions = appStore.getState().sessions;
    const session = sessions.find(s => s.id === sessionId);
    appStore.setState({ currentSessionId: sessionId, currentSession: session || null }, 'SET_CURRENT_SESSION');
  },

  updateSession: (sessionId, updates) => {
    const sessions = appStore.getState().sessions.map(s =>
      s.id === sessionId ? { ...s, ...updates } : s
    );
    const currentSession = appStore.getState().currentSession;
    appStore.setState({
      sessions,
      currentSession: currentSession && currentSession.id === sessionId
        ? { ...currentSession, ...updates }
        : currentSession
    }, 'UPDATE_SESSION');
  },

  addMessage: (message) => {
    const messages = [...appStore.getState().messages, message];
    appStore.setState({ messages }, 'ADD_MESSAGE');
  },

  setMessages: (messages) => appStore.setState({ messages }, 'SET_MESSAGES'),

  updateMessage: (index, updates) => {
    const messages = [...appStore.getState().messages];
    if (index >= 0 && index < messages.length) {
      messages[index] = { ...messages[index], ...updates };
    }
    appStore.setState({ messages }, 'UPDATE_MESSAGE');
  },

  clearMessages: () => appStore.setState({ messages: [] }, 'CLEAR_MESSAGES'),

  setInputValue: (inputValue) => appStore.setState({ inputValue }, 'SET_INPUT_VALUE'),

  setLoading: (isLoading) => appStore.setState({ isLoading }, 'SET_LOADING'),

  setProcessing: (isProcessing) => appStore.setState({ isProcessing }, 'SET_PROCESSING'),

  setError: (error) => appStore.setState({ error }, 'SET_ERROR'),

  clearError: () => appStore.setState({ error: null }, 'CLEAR_ERROR'),

  showToast: (message, type = 'info', duration = 3000) => {
    const toast = { id: Date.now(), message, type };
    const toasts = [...appStore.getState().toasts, toast];
    appStore.setState({ toasts }, 'SHOW_TOAST');

    setTimeout(() => {
      const currentToasts = appStore.getState().toasts.filter(t => t.id !== toast.id);
      appStore.setState({ toasts: currentToasts }, 'HIDE_TOAST');
    }, duration);

    return toast.id;
  },

  hideToast: (toastId) => {
    const toasts = appStore.getState().toasts.filter(t => t.id !== toastId);
    appStore.setState({ toasts }, 'HIDE_TOAST');
  },

  clearToasts: () => appStore.setState({ toasts: [] }, 'CLEAR_TOASTS'),

  setMode: (selectedMode) => appStore.setState({ selectedMode }, 'SET_MODE'),

  setModel: (selectedModel) => appStore.setState({ selectedModel }, 'SET_MODEL'),

  setModels: (models) => appStore.setState({ models }, 'SET_MODELS'),

  setSkills: (skills) => appStore.setState({ skills }, 'SET_SKILLS'),

  toggleSettings: () => appStore.setState({ showSettings: !appStore.getState().showSettings }, 'TOGGLE_SETTINGS')
};

function connectToStore(selector, renderFn) {
  let prevValue = undefined;
  return () => {
    const value = selector(appStore.getState());
    if (value !== prevValue) {
      prevValue = value;
      renderFn(value);
    }
  };
}

function createSelector(keys) {
  return (state) => {
    if (typeof keys === 'string') return state[keys];
    return keys.reduce((obj, key) => {
      obj[key] = state[key];
      return obj;
    }, {});
  };
}

window.Store = Store;
window.appStore = appStore;
window.actions = actions;
window.connectToStore = connectToStore;
window.createSelector = createSelector;