"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      userInfo: {
        avatarUrl: "",
        nickName: "",
        gender: 0,
        region: []
      },
      isLogin: false,
      code: "",
      genderArray: ["未知", "男", "女"],
      genderIndex: 0,
      avatarTempUrl: "/static/default-avatar.png",
      isChoosingAvatar: false,
      tempAvatarBase64: ""
    };
  },
  computed: {
    avatarUrl() {
      return this.avatarTempUrl;
    }
  },
  watch: {
    "userInfo.avatarUrl": {
      immediate: true,
      handler(newVal) {
        this.updateAvatarUrl(newVal);
      }
    }
  },
  onLoad() {
    this.checkLoginStatus();
  },
  methods: {
    async checkLoginStatus() {
      try {
        const openid = common_vendor.index.getStorageSync("openid");
        if (openid) {
          const isValid = await this.validateOpenid(openid);
          if (isValid) {
            this.isLogin = true;
            const userInfo = common_vendor.index.getStorageSync("userInfo");
            if (userInfo) {
              this.userInfo = userInfo;
              this.genderIndex = userInfo.gender || 0;
            }
          } else {
            this.clearUserInfo();
          }
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/my/my.vue:91", "检查登录状态失败:", error);
        this.clearUserInfo();
      }
    },
    async validateOpenid(openid) {
      try {
        const res = await common_vendor.nr.callFunction({
          name: "validateOpenid",
          data: { openid }
        });
        return res.result && res.result.valid;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/my/my.vue:103", "验证openid失败:", error);
        return false;
      }
    },
    clearUserInfo() {
      common_vendor.index.removeStorageSync("openid");
      common_vendor.index.removeStorageSync("userInfo");
      this.isLogin = false;
      this.userInfo = {
        avatarUrl: "",
        nickName: "",
        gender: 0,
        region: []
      };
      this.genderIndex = 0;
    },
    async updateAvatarUrl(fileID) {
      if (!fileID) {
        this.avatarTempUrl = "/static/default-avatar.png";
        return;
      }
      if (fileID.startsWith("http")) {
        this.avatarTempUrl = fileID;
        return;
      }
      const fileName = fileID.split("/").pop();
      this.avatarTempUrl = `https://7463-tcb-hn8ynjkzdpimzki-4cq0cacf172f-1331869289.tcb.qcloud.la/avatar/${fileName}`;
    },
    async onChooseAvatar(e) {
      if (this.isChoosingAvatar)
        return;
      if (e.detail.avatarUrl) {
        this.isChoosingAvatar = true;
        try {
          common_vendor.index.showLoading({
            title: "处理中...",
            mask: true
          });
          const downloadRes = await common_vendor.index.downloadFile({
            url: e.detail.avatarUrl,
            timeout: 1e4
          });
          if (downloadRes.statusCode !== 200) {
            throw new Error("下载头像失败");
          }
          const uploadRes = await common_vendor.nr.uploadFile({
            filePath: downloadRes.tempFilePath,
            cloudPath: `avatar/${Date.now()}.jpg`
          });
          if (uploadRes.fileID) {
            const fileName = uploadRes.fileID.split("/").pop();
            const avatarUrl = `https://7463-tcb-hn8ynjkzdpimzki-4cq0cacf172f-1331869289.tcb.qcloud.la/avatar/${fileName}`;
            this.userInfo.avatarUrl = avatarUrl;
            await this.saveUserInfo();
            common_vendor.index.hideLoading();
            common_vendor.index.showToast({
              title: "头像更新成功",
              icon: "success"
            });
          } else {
            throw new Error("上传头像失败");
          }
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/my/my.vue:180", "处理头像失败:", error);
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({
            title: error.message || "处理头像失败",
            icon: "none"
          });
        } finally {
          this.isChoosingAvatar = false;
        }
      }
    },
    onChooseAvatarError(e) {
      common_vendor.index.__f__("error", "at pages/my/my.vue:192", "选择头像失败:", e);
      this.isChoosingAvatar = false;
      common_vendor.index.hideLoading();
      if (e.detail.errMsg.includes("cancel")) {
        return;
      }
      common_vendor.index.showToast({
        title: "选择头像失败，请重试",
        icon: "none"
      });
    },
    onInputChange(e) {
      this.userInfo.nickName = e.detail.value;
      this.saveUserInfo();
    },
    onGenderChange(e) {
      this.genderIndex = e.detail.value;
      this.userInfo.gender = parseInt(e.detail.value);
      this.saveUserInfo();
    },
    onRegionChange(e) {
      this.userInfo.region = e.detail.value;
      this.saveUserInfo();
    },
    async saveUserInfo() {
      try {
        common_vendor.index.setStorageSync("userInfo", this.userInfo);
        const openid = common_vendor.index.getStorageSync("openid");
        if (openid) {
          await common_vendor.nr.callFunction({
            name: "updateUserInfo",
            data: {
              openid,
              userInfo: this.userInfo
            }
          });
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/my/my.vue:237", "保存用户信息失败:", error);
        common_vendor.index.showToast({
          title: "保存失败，请重试",
          icon: "none"
        });
      }
    },
    async handleLogin() {
      var _a;
      try {
        const loginRes = await common_vendor.index.login();
        common_vendor.index.__f__("log", "at pages/my/my.vue:248", "获取登录凭证结果:", loginRes);
        if (loginRes.errMsg !== "login:ok") {
          throw new Error("获取登录凭证失败");
        }
        const cloudRes = await common_vendor.nr.callFunction({
          name: "login",
          data: {
            code: loginRes.code
          }
        });
        common_vendor.index.__f__("log", "at pages/my/my.vue:262", "云函数返回结果:", cloudRes);
        if (cloudRes.result && cloudRes.result.success) {
          common_vendor.index.setStorageSync("openid", cloudRes.result.data.openid);
          this.isLogin = true;
          if (cloudRes.result.data.userInfo) {
            this.userInfo = cloudRes.result.data.userInfo;
            this.genderIndex = this.userInfo.gender || 0;
            this.saveUserInfo();
          }
          common_vendor.index.showToast({
            title: "登录成功",
            icon: "success"
          });
        } else {
          const errorMsg = ((_a = cloudRes.result) == null ? void 0 : _a.message) || "登录失败";
          throw new Error(errorMsg);
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/my/my.vue:285", "登录失败:", error);
        common_vendor.index.showToast({
          title: error.message || "登录失败，请检查网络设置",
          icon: "none"
        });
      }
    },
    handleLogout() {
      common_vendor.index.showModal({
        title: "提示",
        content: "确定要退出登录吗？",
        success: (res) => {
          if (res.confirm) {
            this.clearUserInfo();
            common_vendor.index.showToast({
              title: "已退出登录",
              icon: "success"
            });
          }
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.isLogin
  }, $data.isLogin ? {
    b: $data.tempAvatarBase64 || $options.avatarUrl,
    c: common_vendor.o((...args) => $options.onChooseAvatar && $options.onChooseAvatar(...args)),
    d: common_vendor.o((...args) => $options.onChooseAvatarError && $options.onChooseAvatarError(...args)),
    e: common_vendor.o((...args) => $options.onInputChange && $options.onInputChange(...args)),
    f: $data.userInfo.nickName,
    g: common_vendor.o(($event) => $data.userInfo.nickName = $event.detail.value),
    h: common_vendor.t($data.genderArray[$data.genderIndex]),
    i: common_vendor.o((...args) => $options.onGenderChange && $options.onGenderChange(...args)),
    j: $data.genderIndex,
    k: $data.genderArray,
    l: common_vendor.t($data.userInfo.region ? $data.userInfo.region.join(" ") : "请选择地区"),
    m: common_vendor.o((...args) => $options.onRegionChange && $options.onRegionChange(...args)),
    n: $data.userInfo.region,
    o: common_vendor.o((...args) => $options.handleLogout && $options.handleLogout(...args))
  } : {
    p: common_vendor.o((...args) => $options.handleLogin && $options.handleLogin(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/my/my.js.map
