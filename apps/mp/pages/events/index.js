const { request } = require('../../utils/request');
const authManager = require('../../utils/auth');

Page({
  data: {
    tabs: [
      { label: '进行中', value: 'ONGOING' },
      { label: '即将开始', value: 'UPCOMING' },
      { label: '已结束', value: 'ENDED' }
    ],
    currentTab: 'ONGOING',
    events: [],
    loading: false,
    refreshing: false,
    userInfo: null,
    isLoggedIn: false,
    userRegistrations: [] // 用户已报名的活动ID列表
  },

  async onLoad() {
    await this.checkLoginStatus();
    await this.loadEvents();
    if (this.data.isLoggedIn) {
      await this.loadUserRegistrations();
    }
  },

  async onShow() {
    await this.checkLoginStatus();
    await this.loadEvents();
    if (this.data.isLoggedIn) {
      await this.loadUserRegistrations();
    }
  },

  // 检查登录状态
  async checkLoginStatus() {
    const isLoggedIn = await authManager.checkLogin();
    const userInfo = authManager.userInfo;
    this.setData({ isLoggedIn, userInfo });
  },

  // 加载活动列表
  async loadEvents() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const { currentTab } = this.data;

      const events = await request({
        url: '/events',
        method: 'GET',
        data: { status: currentTab }
      });

      // 处理活动数据
      const processedEvents = events.map(event => ({
        ...event,
        statusText: this.getStatusText(event.status),
        timeText: this.formatEventTime(event),
        isRegistered: this.data.userRegistrations.includes(event.id),
        canRegister: this.canRegister(event),
        registrationStatus: this.getRegistrationStatus(event)
      }));

      this.setData({
        events: processedEvents,
        loading: false,
        refreshing: false
      });
    } catch (error) {
      console.error('加载活动列表失败:', error);

      // 如果API失败，使用模拟数据
      const mockEvents = this.getMockEvents(this.data.currentTab);
      this.setData({
        events: mockEvents,
        loading: false,
        refreshing: false
      });

      wx.showToast({
        title: '使用模拟数据',
        icon: 'none',
        duration: 1000
      });
    }
  },

  // 加载用户报名的活动
  async loadUserRegistrations() {
    if (!this.data.userInfo?.id) return;

    try {
      const registrations = await request({
        url: `/events/registrations/${this.data.userInfo.id}`,
        method: 'GET'
      });

      const registeredEventIds = registrations.map(reg => reg.event.id);
      this.setData({ userRegistrations: registeredEventIds });
    } catch (error) {
      console.error('加载用户报名活动失败:', error);
    }
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'UPCOMING': '即将开始',
      'ONGOING': '进行中',
      'ENDED': '已结束',
      'CANCELLED': '已取消'
    };
    return statusMap[status] || status;
  },

  // 格式化活动时间
  formatEventTime(event) {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    const now = new Date();

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${month}.${day} ${hours}:${minutes}`;
    };

    if (event.status === 'UPCOMING') {
      const timeDiff = startTime.getTime() - now.getTime();
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        return `${days}天后开始`;
      } else if (hours > 0) {
        return `${hours}小时后开始`;
      } else {
        return '即将开始';
      }
    } else if (event.status === 'ONGOING') {
      const timeDiff = endTime.getTime() - now.getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        return `${hours}小时后结束`;
      } else if (minutes > 0) {
        return `${minutes}分钟后结束`;
      } else {
        return '即将结束';
      }
    } else {
      return `${formatDate(startTime)} - ${formatDate(endTime)}`;
    }
  },

  // 判断是否可以报名
  canRegister(event) {
    if (!this.data.isLoggedIn) return false;
    if (!event.requiresRegistration) return false;
    if (event.status !== 'UPCOMING' && event.status !== 'ONGOING') return false;
    if (this.data.userRegistrations.includes(event.id)) return false;
    if (event.maxParticipants > 0 && event.currentParticipants >= event.maxParticipants) return false;

    const userLevel = this.data.userInfo?.level?.level || 1;
    if (event.minMemberLevel && userLevel < event.minMemberLevel) return false;

    const userPoints = this.data.userInfo?.points || 0;
    if (event.entryFee > 0 && userPoints < event.entryFee) return false;

    return true;
  },

  // 获取报名状态
  getRegistrationStatus(event) {
    if (!event.requiresRegistration) {
      return { text: '无需报名', type: 'info' };
    }

    if (!this.data.isLoggedIn) {
      return { text: '登录报名', type: 'login' };
    }

    if (this.data.userRegistrations.includes(event.id)) {
      return { text: '已报名', type: 'registered' };
    }

    if (event.status === 'ENDED' || event.status === 'CANCELLED') {
      return { text: '已结束', type: 'disabled' };
    }

    if (event.maxParticipants > 0 && event.currentParticipants >= event.maxParticipants) {
      return { text: '名额已满', type: 'disabled' };
    }

    const userLevel = this.data.userInfo?.level?.level || 1;
    if (event.minMemberLevel && userLevel < event.minMemberLevel) {
      return { text: `需V${event.minMemberLevel}`, type: 'disabled' };
    }

    const userPoints = this.data.userInfo?.points || 0;
    if (event.entryFee > 0 && userPoints < event.entryFee) {
      return { text: '积分不足', type: 'disabled' };
    }

    return { text: '立即报名', type: 'register' };
  },

  // 获取模拟数据
  getMockEvents(status) {
    const baseEvents = [
      {
        id: '1',
        name: '新年德州扑克大赛',
        description: '迎新春德州扑克锦标赛，丰厚奖品等你来拿！比赛采用无限注德州扑克规则，设有多个级别适合不同水平的玩家参与。',
        type: 'TOURNAMENT',
        coverImage: '',
        maxParticipants: 100,
        currentParticipants: 45,
        entryFee: 500,
        rewardPoints: 2000,
        location: '德州主题酒吧VIP包厅',
        minMemberLevel: 2,
        requiresRegistration: true
      },
      {
        id: '2',
        name: '会员专享优惠夜',
        description: '仅限会员参与的特殊优惠活动，享受折扣价格和专属服务。当晚所有酒水8折，小食6折，还有神秘礼品等你来拿！',
        type: 'PROMOTION',
        coverImage: '',
        maxParticipants: 50,
        currentParticipants: 23,
        entryFee: 0,
        rewardPoints: 300,
        location: '德州主题酒吧全场',
        minMemberLevel: 1,
        requiresRegistration: true
      },
      {
        id: '3',
        name: '德州扑克入门课程',
        description: '专业教练教学，从基础规则到进阶技巧，适合新手玩家。课程包含理论讲解和实战练习，助你快速提升牌技水平。',
        type: 'SPECIAL',
        coverImage: '',
        maxParticipants: 20,
        currentParticipants: 12,
        entryFee: 200,
        rewardPoints: 500,
        location: '德州主题酒吧培训室',
        minMemberLevel: 1,
        requiresRegistration: true
      }
    ];

    // 根据状态设置不同的时间
    const now = new Date();
    return baseEvents.map((event, index) => {
      let startTime, endTime, eventStatus;

      if (status === 'UPCOMING') {
        startTime = new Date(now.getTime() + (index + 1) * 24 * 60 * 60 * 1000); // 1-3天后
        endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000); // 持续4小时
        eventStatus = 'UPCOMING';
      } else if (status === 'ONGOING') {
        startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2小时前开始
        endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2小时后结束
        eventStatus = 'ONGOING';
      } else {
        startTime = new Date(now.getTime() - (index + 3) * 24 * 60 * 60 * 1000); // 3-5天前
        endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000);
        eventStatus = 'ENDED';
      }

      return {
        ...event,
        status: eventStatus,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        statusText: this.getStatusText(eventStatus),
        timeText: this.formatEventTime({ ...event, status: eventStatus, startTime, endTime }),
        isRegistered: index === 0, // 假设第一个活动已报名
        canRegister: eventStatus !== 'ENDED' && index !== 0,
        registrationStatus: this.getRegistrationStatus({
          ...event,
          status: eventStatus,
          id: event.id
        })
      };
    });
  },

  // 切换标签
  async switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.currentTab) return;

    this.setData({
      currentTab: tab,
      events: []
    });

    await this.loadEvents();
  },

  // 下拉刷新
  async onRefresh() {
    this.setData({ refreshing: true });
    await this.loadEvents();
    if (this.data.isLoggedIn) {
      await this.loadUserRegistrations();
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.onRefresh();
    wx.stopPullDownRefresh();
  },

  // 活动报名
  async registerEvent(e) {
    const eventId = e.currentTarget.dataset.id;

    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '报名活动需要登录，是否前往登录？',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/index?redirect=' + encodeURIComponent('/pages/events/index')
            });
          }
        }
      });
      return;
    }

    const event = this.data.events.find(e => e.id === eventId);
    if (!event || !event.canRegister) return;

    let confirmContent = `确定要报名参加"${event.name}"吗？`;
    if (event.entryFee > 0) {
      confirmContent += `\n\n报名费用：${event.entryFee}积分`;
    }

    wx.showModal({
      title: '确认报名',
      content: confirmContent,
      confirmText: '确认报名',
      success: async (res) => {
        if (res.confirm) {
          await this.doRegisterEvent(eventId);
        }
      }
    });
  },

  // 执行报名
  async doRegisterEvent(eventId) {
    try {
      wx.showLoading({ title: '报名中...' });

      await request({
        url: `/events/${eventId}/register`,
        method: 'POST',
        data: {
          memberId: this.data.userInfo.id
        }
      });

      wx.hideLoading();
      wx.showToast({
        title: '报名成功',
        icon: 'success'
      });

      // 刷新数据
      await this.loadEvents();
      await this.loadUserRegistrations();
    } catch (error) {
      wx.hideLoading();
      console.error('报名失败:', error);

      let errorMessage = '报名失败，请重试';
      if (error.message.includes('积分不足')) {
        errorMessage = '积分不足，无法报名';
      } else if (error.message.includes('等级')) {
        errorMessage = '会员等级不足';
      } else if (error.message.includes('已满')) {
        errorMessage = '报名人数已满';
      } else if (error.message.includes('已报名')) {
        errorMessage = '您已经报名过了';
      }

      wx.showToast({
        title: errorMessage,
        icon: 'none'
      });
    }
  },

  // 查看活动详情
  viewEventDetail(e) {
    const eventId = e.currentTarget.dataset.id;
    // 这里可以跳转到活动详情页面
    console.log('查看活动详情:', eventId);
    wx.showToast({
      title: '活动详情页开发中',
      icon: 'none'
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '精彩活动等你来参加！',
      path: '/pages/events/index',
      imageUrl: '/assets/share-events.jpg'
    };
  }
});