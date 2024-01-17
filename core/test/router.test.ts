import { deepStrictEqual, equal } from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'

import {
  addCategory,
  addFeed,
  deleteFeed,
  isFastRoute,
  isGuestRoute,
  isOrganizeRoute,
  isSettingsRoute,
  isSlowRoute,
  router,
  testFeed,
  userId
} from '../index.js'
import {
  cleanClientTest,
  enableClientTest,
  setBaseRoute,
  testRouter
} from './utils.js'

beforeEach(() => {
  enableClientTest({
    baseRouter: testRouter
  })
})

afterEach(async () => {
  await cleanClientTest()
})

test('opens 404', () => {
  setBaseRoute(undefined)
  deepStrictEqual(router.get(), {
    params: {},
    redirect: false,
    route: 'notFound'
  })
})

test('transforms routers for guest', () => {
  userId.set(undefined)
  setBaseRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: false,
    route: 'start'
  })

  setBaseRoute({ params: {}, route: 'slowAll' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: false,
    route: 'start'
  })

  setBaseRoute({ params: {}, route: 'signin' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: false,
    route: 'signin'
  })
})

test('transforms routers for users', () => {
  userId.set('10')
  setBaseRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })

  setBaseRoute({ params: { category: 'general' }, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: { category: 'general' },
    redirect: false,
    route: 'fast'
  })

  setBaseRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })

  setBaseRoute({ params: {}, route: 'signin' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })

  userId.set(undefined)
  deepStrictEqual(router.get(), {
    params: {},
    redirect: false,
    route: 'signin'
  })
})

test('transforms routers for users with feeds', async () => {
  userId.set('10')
  setBaseRoute({ params: {}, route: 'home' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })

  let id = await addFeed(testFeed())
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'slowAll'
  })

  setBaseRoute({ params: {}, route: 'welcome' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'slowAll'
  })

  setBaseRoute({ params: {}, route: 'home' })
  await deleteFeed(id)
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'welcome'
  })
})

test('transforms settings to first settings page', () => {
  userId.set('10')
  setBaseRoute({ params: {}, route: 'settings' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: true,
    route: 'interface'
  })
})

test('transforms routers to first fast category', async () => {
  userId.set('10')
  let idA = await addCategory({ title: 'A' })
  let idB = await addCategory({ title: 'B' })
  await addFeed(testFeed({ categoryId: idA, reading: 'fast' }))
  await addFeed(testFeed({ categoryId: idB, reading: 'fast' }))

  setBaseRoute({ params: {}, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: false,
    route: 'fast'
  })

  await setTimeout(100)
  deepStrictEqual(router.get(), {
    params: { category: idA },
    redirect: true,
    route: 'fast'
  })
})

test('has routes groups', () => {
  userId.set(undefined)
  setBaseRoute({ params: {}, route: 'home' })
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), true)
  equal(isSettingsRoute(router.get()), false)
  equal(isOrganizeRoute(router.get()), false)

  userId.set('10')
  setBaseRoute({ params: {}, route: 'refresh' })
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), false)
  equal(isSettingsRoute(router.get()), false)
  equal(isOrganizeRoute(router.get()), false)

  setBaseRoute({ params: {}, route: 'slowAll' })
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), true)
  equal(isGuestRoute(router.get()), false)
  equal(isSettingsRoute(router.get()), false)
  equal(isOrganizeRoute(router.get()), false)

  setBaseRoute({ params: { category: 'general' }, route: 'fast' })
  equal(isFastRoute(router.get()), true)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), false)
  equal(isSettingsRoute(router.get()), false)
  equal(isOrganizeRoute(router.get()), false)

  setBaseRoute({ params: {}, route: 'profile' })
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), false)
  equal(isSettingsRoute(router.get()), true)
  equal(isOrganizeRoute(router.get()), false)

  setBaseRoute({ params: {}, route: 'categories' })
  equal(isFastRoute(router.get()), false)
  equal(isSlowRoute(router.get()), false)
  equal(isGuestRoute(router.get()), false)
  equal(isSettingsRoute(router.get()), false)
  equal(isOrganizeRoute(router.get()), true)
})

test('converts since to number', async () => {
  userId.set('10')
  let idA = await addCategory({ title: 'A' })

  setBaseRoute({ params: { category: idA, since: '1000' }, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: { category: idA, since: 1000 },
    redirect: false,
    route: 'fast'
  })

  setBaseRoute({ params: { category: idA, since: '1000k' }, route: 'fast' })
  deepStrictEqual(router.get(), {
    params: {},
    redirect: false,
    route: 'notFound'
  })
})
