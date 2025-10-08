import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Users, 
  Shield, 
  Activity, 
  MessageSquare, 
  UserPlus,
  Ban,
  CheckCircle,
  XCircle,
  Trash2,
  AlertCircle,
  FileText,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { UploadDialog } from "@/components/UploadDialog";

const createUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  employeeId: z.string().optional(),
  mobile: z.string().optional(),
  isAdmin: z.boolean().default(false),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createUserOpen, setCreateUserOpen] = useState(false);
  
  // Admin check
  if (!(user as any)?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You do not have administrator privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/'} className="w-full" data-testid="button-go-home">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch password reset requests
  const { data: resetRequests = [], isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/password-resets/pending"],
  });

  // Fetch activity data
  const { data: activityData = [], isLoading: activityLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/activity"],
  });

  // Fetch feedback
  const { data: feedbacks = [], isLoading: feedbacksLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/feedback"],
  });

  // Fetch documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery<any[]>({
    queryKey: ["/api/documents"],
  });

  // Create user mutation
  const createUserForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      employeeId: "",
      mobile: "",
      isAdmin: false,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      const res = await apiRequest("POST", "/api/admin/users", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setCreateUserOpen(false);
      createUserForm.reset();
      toast({
        title: "User created",
        description: "The user has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle user active status
  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}`, { isActive });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "User status has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeleteUserId(null);
      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Review password reset request
  const reviewRequestMutation = useMutation({
    mutationFn: async ({ requestId, action, note }: { requestId: string; action: "approve" | "reject"; note: string }) => {
      const res = await apiRequest("POST", `/api/admin/password-resets/${requestId}/${action}`, { note });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${action} request`);
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/password-resets/pending"] });
      setReviewRequestId(null);
      setReviewNote("");
      setReviewAction(null);
      toast({
        title: variables.action === "approve" ? "Request approved" : "Request rejected",
        description: `Password reset request has been ${variables.action}d.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReviewRequest = () => {
    if (reviewRequestId && reviewAction) {
      reviewRequestMutation.mutate({
        requestId: reviewRequestId,
        action: reviewAction,
        note: reviewNote,
      });
    }
  };

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await apiRequest("DELETE", `/api/documents/${documentId}`, {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete document");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setDeleteDocumentId(null);
      toast({
        title: "Document deleted",
        description: "Document has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage users, approve password resets, and monitor system activity
          </p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="resets" data-testid="tab-resets">
              <Shield className="w-4 h-4 mr-2" />
              Password Resets
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Activity className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="feedback" data-testid="tab-feedback">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Create, manage, and monitor user accounts</CardDescription>
                </div>
                <Dialog open={createUserOpen} onOpenChange={(open) => !createUserMutation.isPending && setCreateUserOpen(open)}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-user">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new user to the system
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...createUserForm}>
                      <form onSubmit={createUserForm.handleSubmit((data) => createUserMutation.mutate(data))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={createUserForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-create-firstname" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createUserForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-create-lastname" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={createUserForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" data-testid="input-create-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createUserForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password *</FormLabel>
                              <FormControl>
                                <Input {...field} type="password" data-testid="input-create-password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={createUserForm.control}
                            name="employeeId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Employee ID</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-create-employee-id" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createUserForm.control}
                            name="mobile"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mobile</FormLabel>
                                <FormControl>
                                  <Input {...field} type="tel" data-testid="input-create-mobile" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isAdmin"
                            {...createUserForm.register("isAdmin")}
                            className="rounded"
                            data-testid="checkbox-create-admin"
                          />
                          <label htmlFor="isAdmin" className="text-sm font-medium">
                            Admin User
                          </label>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-submit-create-user">
                            {createUserMutation.isPending ? "Creating..." : "Create User"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No users found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user: any) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.employeeId || "-"}</TableCell>
                          <TableCell>
                            {user.isAdmin ? (
                              <Badge variant="default" data-testid={`badge-admin-${user.id}`}>Admin</Badge>
                            ) : (
                              <Badge variant="secondary" data-testid={`badge-user-${user.id}`}>User</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.isActive ? (
                              <Badge variant="outline" className="border-green-500 text-green-500" data-testid={`badge-active-${user.id}`}>
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-red-500 text-red-500" data-testid={`badge-inactive-${user.id}`}>
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleUserMutation.mutate({ userId: user.id, isActive: !user.isActive })}
                                disabled={toggleUserMutation.isPending}
                                data-testid={`button-toggle-${user.id}`}
                              >
                                {user.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteUserId(user.id)}
                                disabled={deleteUserMutation.isPending}
                                data-testid={`button-delete-${user.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Resets Tab */}
          <TabsContent value="resets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Password Reset Requests</CardTitle>
                <CardDescription>Review and approve pending password reset requests</CardDescription>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading requests...</div>
                ) : resetRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No pending password reset requests</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resetRequests.map((request: any) => (
                        <TableRow key={request.id} data-testid={`row-reset-${request.id}`}>
                          <TableCell className="font-medium">
                            {request.user?.firstName} {request.user?.lastName}
                          </TableCell>
                          <TableCell>{request.user?.email}</TableCell>
                          <TableCell>{format(new Date(request.requestedAt), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-yellow-500 text-yellow-500" data-testid={`badge-pending-${request.id}`}>
                              Pending
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setReviewRequestId(request.id);
                                  setReviewAction("approve");
                                }}
                                disabled={reviewRequestMutation.isPending}
                                data-testid={`button-approve-${request.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setReviewRequestId(request.id);
                                  setReviewAction("reject");
                                }}
                                disabled={reviewRequestMutation.isPending}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Activity (Last 30 Days)</CardTitle>
                <CardDescription>Monitor user login activity and chat usage</CardDescription>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
                ) : activityData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No activity data available</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Login Count</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Total Messages</TableHead>
                        <TableHead>Active Conversations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityData.map((activity: any) => (
                        <TableRow key={activity.userId} data-testid={`row-activity-${activity.userId}`}>
                          <TableCell className="font-medium">
                            {activity.user?.firstName} {activity.user?.lastName}
                          </TableCell>
                          <TableCell>{activity.user?.email}</TableCell>
                          <TableCell data-testid={`text-login-count-${activity.userId}`}>
                            {activity.loginCount}
                          </TableCell>
                          <TableCell data-testid={`text-last-login-${activity.userId}`}>
                            {activity.lastLogin ? format(new Date(activity.lastLogin), "MMM d, yyyy") : "-"}
                          </TableCell>
                          <TableCell data-testid={`text-message-count-${activity.userId}`}>
                            {activity.messageCount}
                          </TableCell>
                          <TableCell data-testid={`text-conversation-count-${activity.userId}`}>
                            {activity.conversationCount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Feedback</CardTitle>
                <CardDescription>Review feedback submitted by users</CardDescription>
              </CardHeader>
              <CardContent>
                {feedbacksLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading feedback...</div>
                ) : feedbacks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No feedback submitted yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedbacks.map((feedback: any) => (
                      <Card key={feedback.id} data-testid={`card-feedback-${feedback.id}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {feedback.user?.firstName} {feedback.user?.lastName}
                              </span>
                              <Badge variant={
                                feedback.feedbackType === "positive" ? "default" :
                                feedback.feedbackType === "negative" ? "destructive" :
                                "secondary"
                              } data-testid={`badge-type-${feedback.id}`}>
                                {feedback.feedbackType}
                              </Badge>
                              {feedback.rating && (
                                <Badge variant="outline" data-testid={`badge-rating-${feedback.id}`}>
                                  ⭐ {feedback.rating}/5
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(feedback.submittedAt), "MMM d, yyyy")}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm" data-testid={`text-feedback-${feedback.id}`}>
                            {feedback.feedbackText || "No comment provided"}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Document Management</CardTitle>
                  <CardDescription>Upload and manage documents for AI knowledge base</CardDescription>
                </div>
                <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-upload-document">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium mb-2">No documents uploaded</p>
                    <p className="text-sm">Upload documents to build the AI knowledge base</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc: any) => (
                        <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                          <TableCell className="font-medium" data-testid={`text-filename-${doc.id}`}>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              {doc.originalFilename}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" data-testid={`badge-type-${doc.id}`}>
                              {doc.fileType.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-size-${doc.id}`}>
                            {doc.fileSize}
                          </TableCell>
                          <TableCell data-testid={`text-upload-date-${doc.id}`}>
                            {format(new Date(doc.uploadDate), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteDocumentId(doc.id)}
                              data-testid={`button-delete-document-${doc.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Dialog */}
      <UploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />

      {/* Delete Document Confirmation Dialog */}
      <AlertDialog open={!!deleteDocumentId} onOpenChange={(open) => !deleteDocumentMutation.isPending && !open && setDeleteDocumentId(null)}>
        <AlertDialogContent data-testid="dialog-delete-document">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document and all its associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDocumentMutation.isPending} data-testid="button-cancel-delete-document">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDocumentId && deleteDocumentMutation.mutate(deleteDocumentId)}
              disabled={deleteDocumentMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-document"
            >
              {deleteDocumentMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !deleteUserMutation.isPending && !open && setDeleteUserId(null)}>
        <AlertDialogContent data-testid="dialog-delete-user">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user and all their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending} data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteUserMutation.mutate(deleteUserId)}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Reset Request Dialog */}
      <Dialog open={!!reviewRequestId} onOpenChange={(open) => {
        if (!reviewRequestMutation.isPending && !open) {
          setReviewRequestId(null);
          setReviewNote("");
          setReviewAction(null);
        }
      }}>
        <DialogContent data-testid="dialog-review-reset">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve" : "Reject"} Password Reset
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve" 
                ? "The user's password will be updated immediately upon approval."
                : "The user will need to submit a new password reset request."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Review Note (Optional)</label>
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Add a note about your decision..."
                data-testid="textarea-review-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setReviewRequestId(null);
              setReviewNote("");
              setReviewAction(null);
            }} disabled={reviewRequestMutation.isPending} data-testid="button-cancel-review">
              Cancel
            </Button>
            <Button
              onClick={handleReviewRequest}
              disabled={reviewRequestMutation.isPending}
              variant={reviewAction === "approve" ? "default" : "destructive"}
              data-testid="button-confirm-review"
            >
              {reviewRequestMutation.isPending ? "Processing..." : reviewAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
