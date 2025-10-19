# How to use a standalone Expo module

_Learn how to use a standalone module created with create-expo-module in your project by using a monorepo or publishing the package to npm._

**The recommended way to create an Expo module** in an existing project is described in the [Expo Modules API: Get Started](https://docs.expo.dev/modules/get-started/) guide. This tutorial explains two additional methods for using a module created with `create-expo-module` in an existing project:

- [Configure a monorepo](#use-a-monorepo)
- [Publish the module to npm](#publish-the-module-to-npm)

These methods are useful if you still want to keep the module separate from the application or share it with other developers.

## Use a monorepo

Your project should use the following structure:

- **apps**: A directory to store multiple projects, including React Native apps.
- **packages**: A directory to keep different packages used by your apps.
- **package.json**: This is the root package file that contains the Yarn workspaces configuration.

> **info** To learn how to configure your project as a monorepo, check out the [Working with monorepos](https://docs.expo.dev/guides/monorepos/) guide.

<Step label="1">

### Initialize a new module

Once you have set up the basic monorepo structure, create a new module using `create-expo-module` with the flag `--no-example` to skip creating the example app:

```bash
$ npx create-expo-module packages/expo-settings --no-example
```

</Step>

<Step label="2">

### Set up a workspace dependency

Add your native module from **packages** to your apps' dependencies. Update the **package.json** file in each app inside the **apps** directory that will use your native module and add your native module to the existing entries of dependencies:

```json package.json
{
  "dependencies": {
    /* @hide ... */ /* @end */
    "expo-settings": "*"
    /* @hide ... */ /* @end */
  }
}
```

</Step>

<Step label="3">

### Run the module

Run one of your apps to ensure everything works. Then, start the TypeScript compiler in **packages/expo-settings** to watch for changes and rebuild the module's JavaScript:

```bash
$ cd packages/expo-settings
$ npm run build
```

Open another terminal window, select an app from the **apps** directory, and run the `prebuild` command with the `--clean` option. Repeat these steps for each app in your monorepo to use the new module.

```bash
$ npx expo prebuild --clean
```

Compile and run the app with the following command:

```bash
# Run the app on Android
$ npx expo run:android
# Run the app on iOS
$ npx expo run:ios
```

You can now use the module in your app. To test it, edit the **app/(tabs)/index.tsx** file in your app and render the text message from the `expo-settings` module:

```tsx app/(tabs)/index.tsx
import React from 'react';
import { Text, View } from 'react-native';
import * as Settings from 'expo-settings';

export default function TabOneScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{Settings.hello()}</Text>
    </View>
  );
}
```

After this configuration, the app displays the text "Hello world! 👋".

</Step>

## Publish the module to npm

You can publish the module on npm and install it as a dependency in your project by following the steps below.

<Step label="1">

### Initialize a new module

Start by creating a new module with `create-expo-module`. Follow the prompts carefully, as you will publish this library, and choose a unique name for your npm package.

```bash
$ npx create-expo-module expo-settings
```

</Step>

<Step label="2">

### Run the example project

Run one of your apps to ensure everything works. Then, start the TypeScript compiler in the root of your project to watch for changes and rebuild the module's JavaScript:

```bash
# Run this in the root of the project to start the TypeScript compiler
$ npm run build
```

Open another terminal window, compile and run the example app:

```bash
$ cd example
# Run the example app on Android
$ npx expo run:android
# Run the example app on iOS
$ npx expo run:ios
```

</Step>

<Step label="3">

### Publish the package to npm

To publish your package to npm, you need an npm account. If you don't have one, create an account on [the npm website](https://www.npmjs.com/signup). After creating an account, log in by running the following command:

```bash
$ npm login
```

Navigate to the root of your module, then run the following command to publish it:

```bash
$ npm publish
```

Your module will now be published to npm and can be installed in other projects using `npm install`.

Apart from publishing your module to npm, you can use it in your project in the following ways:

- **Create a tarball**: Use `npm pack` to create a tarball of your module, then install it in your project by running `npm install /path/to/tarball`. This method is helpful for testing your module locally before publishing it or sharing it with others who don't have access to the npm registry.
- **Run a local npm registry**: Use a tool such as [Verdaccio](https://verdaccio.org/) to host a local npm registry. You can install your module from this registry, which is useful for managing internal packages within a company or organization.
- **Publish a private package**: [Use a private registry with EAS Build](https://docs.expo.dev/build-reference/private-npm-packages/) to manage private modules securely.

</Step>

<Step label="4">

### Test the published module

To test the published module in a new project, create a new app and install the module as a dependency by running the following command:

```bash
$ npx create-expo-app my-app
$ cd my-app
$ npx expo install expo-settings
```

You can now use the module in your app! To test it, edit **app/(tabs)/index.tsx** and render the text message from **expo-settings**.

```tsx app/(tabs)/index.tsx
import React from 'react';
import * as Settings from 'expo-settings';
import { Text, View } from 'react-native';

export default function TabOneScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{Settings.hello()}</Text>
    </View>
  );
}
```

Finally, prebuild your project and run the app by executing the following commands:

```bash
# Re-generate the native project directories from scratch
$ npx expo prebuild --clean
# Run the example app on Android
$ npx expo run:android
# Run the example app on iOS
$ npx expo run:ios
```

After this configuration, you see the text "Hello world! 👋" displayed in the app.

</Step>

## Next steps

[Wrap third-party native libraries](https://docs.expo.dev/modules/third-party-library/)

[Tutorial: Creating a native module](https://docs.expo.dev/modules/native-module-tutorial/)