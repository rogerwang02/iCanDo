'use strict';
const db = uniCloud.database()

exports.main = async (event, context) => {
    const { openid } = event
    
    try {
        // 查询用户表中是否存在该openid
        const user = await db.collection('users').where({
            openid: openid
        }).get()
        
        return {
            success: true,
            valid: user.data.length > 0
        }
    } catch (error) {
        console.error('验证openid失败:', error)
        return {
            success: false,
            message: '验证失败'
        }
    }
} 