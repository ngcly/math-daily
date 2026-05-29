"use strict";
const common_vendor = require("../common/vendor.js");
const STORAGE_PREFIX = "draft_";
const MAX_STORED_DRAFTS = 30;
const useDraftStore = common_vendor.defineStore("draft", () => {
  const strokes = common_vendor.ref([]);
  const currentQId = common_vendor.ref("");
  const isDirty = common_vendor.ref(false);
  function load(questionId) {
    currentQId.value = questionId;
    const raw = common_vendor.index.getStorageSync(`${STORAGE_PREFIX}${questionId}`);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        strokes.value = data.strokes;
        return data;
      } catch {
        strokes.value = [];
      }
    } else {
      strokes.value = [];
    }
    return null;
  }
  function save(questionId, data) {
    strokes.value = data.strokes;
    isDirty.value = false;
    try {
      common_vendor.index.setStorageSync(`${STORAGE_PREFIX}${questionId}`, JSON.stringify(data));
    } catch (e) {
      console.warn("[DraftStore] save failed", e);
    }
  }
  function clear(questionId) {
    strokes.value = [];
    isDirty.value = false;
    common_vendor.index.removeStorageSync(`${STORAGE_PREFIX}${questionId}`);
  }
  function cleanup() {
    try {
      const info = common_vendor.index.getStorageInfoSync();
      const draftKeys = info.keys.filter((k) => k.startsWith(STORAGE_PREFIX));
      const draftsWithTime = draftKeys.map((k) => {
        try {
          const data = JSON.parse(common_vendor.index.getStorageSync(k));
          return { key: k, savedAt: (data == null ? void 0 : data.savedAt) ?? 0 };
        } catch {
          return { key: k, savedAt: 0 };
        }
      });
      draftsWithTime.sort((a, b) => b.savedAt - a.savedAt).slice(MAX_STORED_DRAFTS).forEach(({ key }) => common_vendor.index.removeStorageSync(key));
    } catch {
    }
  }
  function clearAll() {
    try {
      const info = common_vendor.index.getStorageInfoSync();
      info.keys.filter((k) => k.startsWith(STORAGE_PREFIX)).forEach((k) => common_vendor.index.removeStorageSync(k));
      strokes.value = [];
      isDirty.value = false;
    } catch {
    }
  }
  return {
    strokes,
    currentQId,
    isDirty,
    load,
    save,
    clear,
    clearAll,
    cleanup
  };
});
exports.useDraftStore = useDraftStore;
