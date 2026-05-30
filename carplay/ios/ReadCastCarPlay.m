#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(ReadCastCarPlay, RCTEventEmitter)

RCT_EXTERN_METHOD(setQueue:(NSArray *)items)
RCT_EXTERN_METHOD(setNowPlaying:(NSDictionary *)info)

@end
