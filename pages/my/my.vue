<template>
    <view class="container">
        <template v-if="isLogin">
            <view class="avatar-container">
                <button class="avatar-wrapper" open-type="chooseAvatar" @chooseavatar="onChooseAvatar" @error="onChooseAvatarError">
                    <image class="avatar" :src="tempAvatarBase64 || avatarUrl" mode="aspectFill"></image>
                </button>
            </view>
            <view class="user-info">
                <view class="nickname">
                    <input type="nickname" class="weui-input" placeholder="请输入昵称" v-model="userInfo.nickName" @change="onInputChange"/>
                </view>
                <view class="gender">
                    <picker @change="onGenderChange" :value="genderIndex" :range="genderArray">
                        <view class="picker">
                            性别：{{genderArray[genderIndex]}}
                        </view>
                    </picker>
                </view>
                <view class="region">
                    <picker mode="region" @change="onRegionChange" :value="userInfo.region">
                        <view class="picker">
                            地区：{{userInfo.region ? userInfo.region.join(' ') : '请选择地区'}}
                        </view>
                    </picker>
                </view>
            </view>
            <view class="tip-text">您可以自定义头像和昵称</view>
            <button class="logout-btn" @click="handleLogout">退出登录</button>
        </template>
        <template v-else>
            <button class="login-btn" type="primary" @click="handleLogin">微信登录</button>
        </template>
    </view>
</template>

<script>
export default {
    data() {
        return {
            userInfo: {
                avatarUrl: '',
                nickName: '',
                gender: 0,
                region: []
            },
            isLogin: false,
            code: '',
            genderArray: ['未知', '男', '女'],
            genderIndex: 0,
            avatarTempUrl: '/static/default-avatar.png',
            isChoosingAvatar: false,
            tempAvatarBase64: ''
        }
    },
    computed: {
        avatarUrl() {
            return this.avatarTempUrl
        }
    },
    watch: {
        'userInfo.avatarUrl': {
            immediate: true,
            handler(newVal) {
                this.updateAvatarUrl(newVal)
            }
        }
    },
    onLoad() {
        this.checkLoginStatus()
    },
    methods: {
        async checkLoginStatus() {
            try {
                const openid = uni.getStorageSync('openid')
                if (openid) {
                    // 验证openid是否有效
                    const isValid = await this.validateOpenid(openid)
                    if (isValid) {
                        this.isLogin = true
                        const userInfo = uni.getStorageSync('userInfo')
                        if (userInfo) {
                            this.userInfo = userInfo
                            this.genderIndex = userInfo.gender || 0
                        }
                    } else {
                        this.clearUserInfo()
                    }
                }
            } catch (error) {
                console.error('检查登录状态失败:', error)
                this.clearUserInfo()
            }
        },
        async validateOpenid(openid) {
            try {
                const res = await uniCloud.callFunction({
                    name: 'validateOpenid',
                    data: { openid }
                })
                return res.result && res.result.valid
            } catch (error) {
                console.error('验证openid失败:', error)
                return false
            }
        },
        clearUserInfo() {
            uni.removeStorageSync('openid')
            uni.removeStorageSync('userInfo')
            this.isLogin = false
            this.userInfo = {
                avatarUrl: '',
                nickName: '',
                gender: 0,
                region: []
            }
            this.genderIndex = 0
        },
        async updateAvatarUrl(fileID) {
            if (!fileID) {
                this.avatarTempUrl = '/static/default-avatar.png'
                return
            }
            
            // 如果是http开头的URL，直接使用
            if (fileID.startsWith('http')) {
                this.avatarTempUrl = fileID
                return
            }
            
            // 从fileID中提取文件名
            const fileName = fileID.split('/').pop()
            // 使用正确的腾讯云存储域名
            this.avatarTempUrl = `https://7463-tcb-hn8ynjkzdpimzki-4cq0cacf172f-1331869289.tcb.qcloud.la/avatar/${fileName}`
        },
        async onChooseAvatar(e) {
            if (this.isChoosingAvatar) return
            
            if (e.detail.avatarUrl) {
                this.isChoosingAvatar = true
                try {
                    // 显示加载提示
                    uni.showLoading({
                        title: '处理中...',
                        mask: true
                    })
                    
                    // 先下载临时文件
                    const downloadRes = await uni.downloadFile({
                        url: e.detail.avatarUrl,
                        timeout: 10000
                    })
                    
                    if (downloadRes.statusCode !== 200) {
                        throw new Error('下载头像失败')
                    }
                    
                    // 上传到云存储
                    const uploadRes = await uniCloud.uploadFile({
                        filePath: downloadRes.tempFilePath,
                        cloudPath: `avatar/${Date.now()}.jpg`
                    })
                    
                    if (uploadRes.fileID) {
                        // 从fileID中提取文件名
                        const fileName = uploadRes.fileID.split('/').pop()
                        // 使用正确的腾讯云存储域名
                        const avatarUrl = `https://7463-tcb-hn8ynjkzdpimzki-4cq0cacf172f-1331869289.tcb.qcloud.la/avatar/${fileName}`
                        this.userInfo.avatarUrl = avatarUrl
                        await this.saveUserInfo()
                        uni.hideLoading()
                        uni.showToast({
                            title: '头像更新成功',
                            icon: 'success'
                        })
                    } else {
                        throw new Error('上传头像失败')
                    }
                } catch (error) {
                    console.error('处理头像失败:', error)
                    uni.hideLoading()
                    uni.showToast({
                        title: error.message || '处理头像失败',
                        icon: 'none'
                    })
                } finally {
                    this.isChoosingAvatar = false
                }
            }
        },
        onChooseAvatarError(e) {
            console.error('选择头像失败:', e)
            this.isChoosingAvatar = false
            uni.hideLoading()
            
            // 根据错误类型显示不同的提示
            if (e.detail.errMsg.includes('cancel')) {
                // 用户取消选择，不显示错误提示
                return
            }
            
            uni.showToast({
                title: '选择头像失败，请重试',
                icon: 'none'
            })
        },
        onInputChange(e) {
            this.userInfo.nickName = e.detail.value
            this.saveUserInfo()
        },
        onGenderChange(e) {
            this.genderIndex = e.detail.value
            this.userInfo.gender = parseInt(e.detail.value)
            this.saveUserInfo()
        },
        onRegionChange(e) {
            this.userInfo.region = e.detail.value
            this.saveUserInfo()
        },
        async saveUserInfo() {
            try {
                // 保存到本地
                uni.setStorageSync('userInfo', this.userInfo)
                
                // 同步到服务器
                const openid = uni.getStorageSync('openid')
                if (openid) {
                    await uniCloud.callFunction({
                        name: 'updateUserInfo',
                        data: {
                            openid,
                            userInfo: this.userInfo
                        }
                    })
                }
            } catch (error) {
                console.error('保存用户信息失败:', error)
                uni.showToast({
                    title: '保存失败，请重试',
                    icon: 'none'
                })
            }
        },
        async handleLogin() {
            try {
                // 获取登录凭证
                const loginRes = await uni.login()
                console.log('获取登录凭证结果:', loginRes)
                
                if (loginRes.errMsg !== 'login:ok') {
                    throw new Error('获取登录凭证失败')
                }
                
                // 调用云函数处理登录逻辑
                const cloudRes = await uniCloud.callFunction({
                    name: 'login',
                    data: {
                        code: loginRes.code
                    }
                })
                
                console.log('云函数返回结果:', cloudRes)
                
                if (cloudRes.result && cloudRes.result.success) {
                    // 保存openid
                    uni.setStorageSync('openid', cloudRes.result.data.openid)
                    this.isLogin = true
                    
                    // 获取用户信息
                    if (cloudRes.result.data.userInfo) {
                        this.userInfo = cloudRes.result.data.userInfo
                        this.genderIndex = this.userInfo.gender || 0
                        this.saveUserInfo()
                    }
                    
                    uni.showToast({
                        title: '登录成功',
                        icon: 'success'
                    })
                } else {
                    const errorMsg = cloudRes.result?.message || '登录失败'
                    throw new Error(errorMsg)
                }
            } catch (error) {
                console.error('登录失败:', error)
                uni.showToast({
                    title: error.message || '登录失败，请检查网络设置',
                    icon: 'none'
                })
            }
        },
        handleLogout() {
            uni.showModal({
                title: '提示',
                content: '确定要退出登录吗？',
                success: (res) => {
                    if (res.confirm) {
                        this.clearUserInfo()
                        uni.showToast({
                            title: '已退出登录',
                            icon: 'success'
                        })
                    }
                }
            })
        }
    }
}
</script>

<style>
.container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40rpx;
}

.avatar-container {
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    overflow: hidden;
    margin-bottom: 40rpx;
    background-color: #f0f0f0;
}

.avatar-wrapper {
    width: 100%;
    height: 100%;
    padding: 0;
    background: none;
    border: none;
    line-height: 1;
}

.avatar-wrapper::after {
    border: none;
}

.avatar {
    width: 100%;
    height: 100%;
}

.user-info {
    width: 80%;
    margin-bottom: 20rpx;
}

.nickname, .gender, .region {
    margin-bottom: 20rpx;
}

.weui-input {
    width: 100%;
    height: 80rpx;
    padding: 0 20rpx;
    border: 1px solid #ddd;
    border-radius: 40rpx;
    font-size: 32rpx;
    text-align: center;
}

.picker {
    width: 100%;
    height: 80rpx;
    line-height: 80rpx;
    text-align: center;
    border: 1px solid #ddd;
    border-radius: 40rpx;
    font-size: 32rpx;
}

.tip-text {
    font-size: 24rpx;
    color: #999;
    margin-bottom: 40rpx;
}

.login-btn {
    width: 80%;
    background-color: #007AFF;
    color: #fff;
    border-radius: 40rpx;
    font-size: 32rpx;
}

.logout-btn {
    width: 80%;
    background-color: #ff4d4f;
    color: #fff;
    border-radius: 40rpx;
    font-size: 32rpx;
    margin-top: 20rpx;
}
</style> 