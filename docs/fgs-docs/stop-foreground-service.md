# Stop a Foreground Service

If you want a foreground service to stop running in the foreground, you have two options. You can stop the service, or you can leave the service running but remove it from the foreground.

You can stop a foreground service the same way you would stop any service. The service can call its own `stopSelf()` method, or another component can stop it by calling `stopService()`. If you stop the service while it runs in the foreground, its notification is removed.

To remove a service from the foreground, call `stopForeground(int)` from inside the service. This method takes a boolean, which indicates whether to remove the status bar notification as well. The service continues to run, but it is no longer a foreground service.