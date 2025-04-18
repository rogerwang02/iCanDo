'use strict';
const db = uniCloud.database()
const axios = require('axios')

exports.main = async (event, context) => {
    const { code } = event
    
    if (!code) {
        return {
            success: false,
            message: '缺少登录凭证'
        }
    }
    
    try {
        // 获取微信openid和session_key
        const appid = 'wx1722acd00547083f' // 替换为你的小程序appid
        const secret = '3057be1f0d268e16b4d46489ca082e6c' // 替换为你的小程序secret
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
        
        const response = await axios.get(url)
        const { openid, session_key, errcode, errmsg } = response.data
        
        if (errcode) {
            console.error('微信接口返回错误:', errcode, errmsg)
            return {
                success: false,
                message: `微信接口错误: ${errmsg}`,
                code: errcode
            }
        }
        
        if (!openid) {
            console.error('获取openid失败')
            return {
                success: false,
                message: '获取openid失败'
            }
        }
        
        // 查询用户信息
        const user = await db.collection('users').where({
            openid: openid
        }).get()
        
        let userInfo = null
        if (user.data.length > 0) {
            userInfo = user.data[0]
        } else {
            // 创建新用户
            const newUser = {
                openid,
                createTime: Date.now(),
                updateTime: Date.now()
            }
            const addRes = await db.collection('users').add(newUser)
            if (addRes.id) {
                userInfo = { ...newUser, _id: addRes.id }
            }
        }
        
        return {
            success: true,
            data: {
                openid,
                session_key,
                userInfo
            }
        }
    } catch (error) {
        console.error('登录失败:', error)
        return {
            success: false,
            message: error.message || '登录失败'
        }
    }
} 